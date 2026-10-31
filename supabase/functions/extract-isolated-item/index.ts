/**
 * extract-isolated-item
 *
 * Runs provider extraction for a single video-isolated crop. Called by the
 * Modal video pipeline (service-secret auth) — never by the client directly.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MUST authenticate via VIDEO_CALLBACK_SECRET (Modal service caller)
 * - MAY read scan_sessions
 * - MAY read crop images from storage
 * - MAY call the extraction provider via _shared/providers
 * - MAY update scan_sessions.raw_payload
 * - MAY update scan_sessions.normalized_payload
 * - MAY update extraction_status and error fields
 * - MUST NOT write catalogue_items or catalogue_item_variants
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, internalError } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient } from '../_shared/supabase.ts'
import { markExtractionProcessing, markExtractionSucceeded, markExtractionFailed, buildExtractionRunInfo } from '../_shared/scanSession.ts'
import { createExtractAudit } from '../_shared/extractAudit.ts'
import { validateUUID } from '../_shared/validation.ts'
import { validateEnv } from '../_shared/envValidation.ts'
import { loadSchema } from '../_shared/catalogueSchemaRegistry.ts'
import { getProvider } from '../_shared/providers/getProvider.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

// Validate environment at startup
const env = validateEnv()

const FUNCTION_NAME = 'extract-isolated-item'
const log = createLogger(FUNCTION_NAME)
const audit = createExtractAudit(log)

interface ExtractIsolatedItemRequest {
  parent_scan_session_id: string
  video_job_id: string
  item_scan_session_id: string
  storage_path: string
  mime_type: string
  scan_type: string
  catalogue_type: string
}

async function fetchImageFromStorage(
  supabase: ReturnType<typeof createAdminClient>,
  storagePath: string
): Promise<{ data: Uint8Array; mimeType: string }> {
  const { data, error } = await supabase.storage.from('scan-originals').download(storagePath)

  if (error) {
    throw new Error(`Failed to fetch image from storage: ${error.message}`)
  }
  if (!data) {
    throw new Error(`No data returned from storage for path: ${storagePath}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return { data: new Uint8Array(arrayBuffer), mimeType: 'image/jpeg' }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const methodError = requireMethod(req, 'POST')
  if (methodError) return methodError

  // Service-secret auth: only the Modal pipeline calls this function.
  const callbackSecret = Deno.env.get('VIDEO_CALLBACK_SECRET')
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!callbackSecret || authHeader !== `Bearer ${callbackSecret}`) {
    return json({ error: 'Unauthorized', message: 'Invalid callback secret' }, 401, req)
  }

  const supabaseAdmin = createAdminClient()

  try {
    const body: ExtractIsolatedItemRequest = await req.json()
    const scanSessionId = body.item_scan_session_id
    audit.requestParsed({ scan_session_id: scanSessionId, scan_type: body.scan_type })

    if (!body.parent_scan_session_id) throw new Error('parent_scan_session_id is required')
    if (!body.video_job_id) throw new Error('video_job_id is required')
    if (!scanSessionId) throw new Error('item_scan_session_id is required')
    if (!body.storage_path) throw new Error('storage_path is required')
    if (!body.mime_type) throw new Error('mime_type is required')
    if (!body.scan_type) throw new Error('scan_type is required')
    if (!body.catalogue_type) throw new Error('catalogue_type is required')

    validateUUID(body.parent_scan_session_id, 'parent_scan_session_id')
    validateUUID(body.video_job_id, 'video_job_id')
    validateUUID(scanSessionId, 'item_scan_session_id')

    const schema = await loadSchema(body.catalogue_type)

    const allowedScanTypes = schema.schema.scan_types ? Object.keys(schema.schema.scan_types) : []
    if (allowedScanTypes.length > 0 && !allowedScanTypes.includes(body.scan_type)) {
      throw new Error(
        `Invalid scan_type "${body.scan_type}" for catalogue_type "${body.catalogue_type}". ` +
        `Allowed: ${allowedScanTypes.join(', ')}`
      )
    }

    await markExtractionProcessing(supabaseAdmin, scanSessionId)
    audit.processingStarted({ scan_session_id: scanSessionId })

    audit.sourceDataFetchStarted({ storage_path: body.storage_path })
    const imageData = await fetchImageFromStorage(supabaseAdmin, body.storage_path)
    const imageBase64 = uint8ArrayToBase64(imageData.data)

    audit.extractionStarted({ scan_type: body.scan_type })

    const provider = getProvider()
    const extraction = await provider.extract({
      images: [{ base64: imageBase64, mimeType: body.mime_type }],
      schema,
      scanType: body.scan_type,
    })

    const extractionResult = {
      ...(extraction.json as Record<string, unknown>),
      metadata: {
        extractor_name: `${extraction.provider}-${body.catalogue_type}-extractor`,
        extractor_model: extraction.model,
        extractor_version: '1.0.0',
        extraction_timestamp: new Date().toISOString(),
      },
    }

    const { error: updateError } = await markExtractionSucceeded(
      supabaseAdmin,
      scanSessionId,
      {
        raw_payload: {
          [extraction.provider === 'gemini' ? 'gemini_raw' : `${extraction.provider}_raw`]: extraction.raw,
        },
        normalized_payload: extractionResult,
        metadata: extractionResult.metadata,
        run: buildExtractionRunInfo(extraction, schema),
      }
    )

    if (updateError) {
      throw new Error(`Failed to update scan session: ${updateError.message}`)
    }

    audit.scanSessionUpdated({ scan_session_id: scanSessionId })
    audit.completed({ scan_session_id: scanSessionId })

    return json({ item_scan_session_id: scanSessionId, extraction_status: 'complete' }, 200, req)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    audit.failed({ error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })

    // Never leave the item scan session stuck in `processing` — the video job
    // polls item sessions via review/commit, so record the failure.
    if (scanSessionId) {
      try {
        await markExtractionFailed(supabaseAdmin, scanSessionId, errorMessage)
      } catch (updateErr) {
        audit.failedStateUpdateWarning({ error: updateErr instanceof Error ? updateErr.message : 'Unknown error' })
      }
    }

    return internalError(errorMessage, 'Isolated item extraction failed', req)
  }
})
