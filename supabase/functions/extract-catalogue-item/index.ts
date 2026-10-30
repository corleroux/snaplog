/**
 * extract-catalogue-item
 *
 * Category-agnostic extraction for any catalogue type defined in the schema
 * registry (garment today, anything tomorrow). Loads the active schema for the
 * requested catalogue_type and runs it through the configured provider.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MAY read scan_sessions
 * - MAY read source images from storage
 * - MAY call the extraction provider via _shared/providers (default: muse-spark)
 * - MAY update scan_sessions.raw_payload
 * - MAY update scan_sessions.normalized_payload
 * - MAY update extraction_status and error fields
 * - MUST NOT write catalogue_items or catalogue_item_variants
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, internalError } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
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

const FUNCTION_NAME = 'extract-catalogue-item'
const log = createLogger(FUNCTION_NAME)
const audit = createExtractAudit(log)

const EXTRACTOR_VERSION = '1.0.0'

interface ExtractCatalogueItemRequest {
  scan_session_id: string
  event_id: string
  vendor_id: string
  storage_path: string
  mime_type: string
  scan_type: string
  catalogue_type: string
}

interface CatalogueItemExtractionResponse {
  item: Record<string, unknown>
  metadata: {
    extractor_name: string
    extractor_model: string
    extractor_version: string
    extraction_timestamp: string
  }
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
  const uint8Array = new Uint8Array(arrayBuffer)

  let mimeType = 'image/jpeg'
  const ext = storagePath.split('.').pop()?.toLowerCase()
  if (ext === 'png') mimeType = 'image/png'
  else if (ext === 'webp') mimeType = 'image/webp'

  return { data: uint8Array, mimeType }
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

  const auth = await requireUser(req)
  if (auth.response) return auth.response

  const supabase = createAdminClient()

  try {
    const body: ExtractCatalogueItemRequest = await req.json()
    const scanSessionId = body.scan_session_id
    audit.requestParsed({ scan_session_id: scanSessionId, scan_type: body.scan_type, catalogue_type: body.catalogue_type })

    if (!scanSessionId) throw new Error('scan_session_id is required')
    if (!body.event_id) throw new Error('event_id is required')
    if (!body.vendor_id) throw new Error('vendor_id is required')
    if (!body.storage_path) throw new Error('storage_path is required')
    if (!body.mime_type) throw new Error('mime_type is required')
    if (!body.scan_type) throw new Error('scan_type is required')
    if (!body.catalogue_type) throw new Error('catalogue_type is required')

    validateUUID(scanSessionId, 'scan_session_id')
    validateUUID(body.event_id, 'event_id')
    validateUUID(body.vendor_id, 'vendor_id')

    await markExtractionProcessing(supabase, scanSessionId)
    audit.processingStarted({ scan_session_id: scanSessionId })

    audit.sourceDataFetchStarted({ storage_path: body.storage_path })
    const imageData = await fetchImageFromStorage(supabase, body.storage_path)
    const imageBase64 = uint8ArrayToBase64(imageData.data)

    audit.extractionStarted({ scan_type: body.scan_type })

    const schema = await loadSchema(body.catalogue_type)
    const provider = getProvider()
    const extraction = await provider.extract({
      images: [{ base64: imageBase64, mimeType: body.mime_type }],
      schema,
      scanType: body.scan_type,
    })

    const extractionResult: CatalogueItemExtractionResponse = {
      ...(extraction.json as CatalogueItemExtractionResponse),
      metadata: {
        extractor_name: `${extraction.provider}-${body.catalogue_type}-extractor`,
        extractor_model: extraction.model,
        extractor_version: EXTRACTOR_VERSION,
        extraction_timestamp: new Date().toISOString(),
      },
    }

    const { error: updateError } = await markExtractionSucceeded(
      supabase,
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
      log.error('Failed to update scan session with results', { scan_session_id: scanSessionId, error: updateError.message })
      throw new Error(`Failed to update scan session: ${updateError.message}`)
    }

    audit.scanSessionUpdated({ scan_session_id: scanSessionId })
    audit.completed({ scan_session_id: scanSessionId })

    return json(extractionResult, 200, req)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    audit.failed({ error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })

    if (scanSessionId) {
      try {
        await markExtractionFailed(supabase, scanSessionId, errorMessage)
      } catch (updateErr) {
        audit.failedStateUpdateWarning({ error: updateErr instanceof Error ? updateErr.message : 'Unknown error' })
      }
    }

    return internalError(errorMessage, 'Extraction failed', req)
  }
})
