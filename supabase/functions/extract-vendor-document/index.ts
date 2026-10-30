/**
 * extract-vendor-document
 *
 * Extracts structured vendor data from vendor-identifying images.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MAY read scan_sessions
 * - MAY read source images from storage
 * - MAY call the extraction provider via _shared/providers (default: Gemini)
 * - MAY update scan_sessions.raw_payload
 * - MAY update scan_sessions.normalized_payload
 * - MAY update extraction_status and error fields
 * - MUST NOT create vendors or vendor_images
 *
 * Vendor scan types:
 * - vendor_card: business cards
 * - vendor_signage: booth signage
 * - vendor_brochure: brochures
 * - vendor_catalog: catalog covers
 *
 * Storage bucket: scan-originals
 *
 * EXTRACT FLOW SKELETON:
 * parse -> validate -> process -> load -> extract -> normalize -> persist -> respond
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { handleCors, requireMethod, json, internalError } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { markExtractionProcessing, markExtractionSucceeded, markExtractionFailed, buildExtractionRunInfo } from '../_shared/scanSession.ts'
import { createExtractAudit } from '../_shared/extractAudit.ts'
import { loadSchema } from '../_shared/catalogueSchemaRegistry.ts'
import { getProvider } from '../_shared/providers/getProvider.ts'
import { validateUUID } from '../_shared/validation.ts'
import { validateEnv } from '../_shared/envValidation.ts'
import { classifyError, ErrorType } from '../_shared/errorTypes.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

// Validate environment at startup
const env = validateEnv()

const FUNCTION_NAME = 'extract-vendor-document'
const log = createLogger(FUNCTION_NAME)
const audit = createExtractAudit(log)

// ============================================================================
// TYPES
// ============================================================================

interface ExtractVendorRequest {
  scan_session_id: string
  event_id: string
  storage_path: string
  mime_type: string
  scan_type: 'vendor_card' | 'vendor_signage' | 'vendor_brochure' | 'vendor_catalog'
}

interface ExtractedVendorDocument {
  company_name: string
  booth_number?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  website_url?: string | null
  address?: string | null
  country_of_origin?: string | null
  brand_names?: string[] | null
  notes?: string | null
}

interface ExtractionMetadata {
  extractor_name: string
  extractor_model: string
  extractor_version: string
  confidence_scores?: Record<string, number>
  extraction_timestamp?: string
}

interface VendorExtractionResponse {
  document: ExtractedVendorDocument
  metadata: ExtractionMetadata
}

// ============================================================================
// VALIDATION
// ============================================================================

const VENDOR_SCAN_TYPES = [
  'vendor_card',
  'vendor_signage',
  'vendor_brochure',
  'vendor_catalog',
] as const

function validateVendorScanType(value: string): void {
  if (!VENDOR_SCAN_TYPES.includes(value as any)) {
    throw new Error(
      `Invalid scan_type: must be one of ${VENDOR_SCAN_TYPES.join(', ')}`
    )
  }
}

// ============================================================================
// EXTRACTION PROVIDER (FR-MOD-01)
// ============================================================================
// The catalogue schema comes from the registry (migration 083); the provider
// builds the prompt from it, calls the model and normalises the output.
// All Gemini specifics live in _shared/providers/geminiProvider.ts.

const EXTRACTOR_VERSION = '1.0.0'
const CATALOGUE_SLUG = 'vendor'

// ============================================================================
// STORAGE
// ============================================================================

async function fetchImageFromStorage(
  supabase: ReturnType<typeof createClient>,
  storagePath: string
): Promise<{ data: Uint8Array; mimeType: string }> {
  const { data, error } = await supabase
    .storage
    .from('scan-originals')
    .download(storagePath)

  if (error) {
    throw new Error(`Failed to fetch image from storage: ${error.message}`)
  }

  if (!data) {
    throw new Error(`No data returned from storage for path: ${storagePath}`)
  }

  // Get the array buffer
  const arrayBuffer = await data.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  // Determine mime type from the response or file extension
  let mimeType = 'image/jpeg'
  const ext = storagePath.split('.').pop()?.toLowerCase()
  if (ext === 'png') mimeType = 'image/png'
  else if (ext === 'webp') mimeType = 'image/webp'

  return {
    data: uint8Array,
    mimeType,
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // ============================================================================
  // RUNTIME GUARDS
  // ============================================================================

  const cors = handleCors(req)
  if (cors) return cors

  const methodError = requireMethod(req, 'POST')
  if (methodError) return methodError

  // ============================================================================
  // AUTHENTICATE USER
  // ============================================================================

  const auth = await requireUser(req)
  if (auth.response) return auth.response

  // ============================================================================
  // CREATE ADMIN CLIENT
  // ============================================================================

  const supabase = createAdminClient()

  try {
    // ============================================================================
    // PARSE REQUEST
    // ============================================================================

    const body: ExtractVendorRequest = await req.json()
    // Capture immediately — used in catch block without req.clone() (T3.2)
    const scanSessionId = body.scan_session_id
    audit.requestParsed({ scan_session_id: scanSessionId, scan_type: body.scan_type })

    // ============================================================================
    // VALIDATE REQUEST
    // ============================================================================

    if (!scanSessionId) {
      audit.validationFailed({ error: 'scan_session_id is required' })
      throw new Error('scan_session_id is required')
    }
    if (!body.event_id) {
      audit.validationFailed({ error: 'event_id is required' })
      throw new Error('event_id is required')
    }
    if (!body.storage_path) {
      audit.validationFailed({ error: 'storage_path is required' })
      throw new Error('storage_path is required')
    }
    if (!body.mime_type) {
      audit.validationFailed({ error: 'mime_type is required' })
      throw new Error('mime_type is required')
    }
    if (!body.scan_type) {
      audit.validationFailed({ error: 'scan_type is required' })
      throw new Error('scan_type is required')
    }

    validateUUID(scanSessionId, 'scan_session_id')
    validateUUID(body.event_id, 'event_id')
    validateVendorScanType(body.scan_type)

    // ============================================================================
    // MARK SCAN SESSION PROCESSING
    // ============================================================================

    await markExtractionProcessing(supabase, scanSessionId)
    audit.processingStarted({ scan_session_id: scanSessionId })

    // ============================================================================
    // LOAD SOURCE DATA
    // ============================================================================

    audit.sourceDataFetchStarted({ storage_path: body.storage_path })
    const imageData = await fetchImageFromStorage(supabase, body.storage_path)
    const imageBase64 = uint8ArrayToBase64(imageData.data)

    // ============================================================================
    // RUN EXTRACTION
    // ============================================================================

    audit.extractionStarted({ scan_type: body.scan_type })

    const schema = await loadSchema(CATALOGUE_SLUG)
    const provider = getProvider()
    const extraction = await provider.extract({
      images: [{ base64: imageBase64, mimeType: body.mime_type }],
      schema,
      scanType: body.scan_type,
    })

    // Same response shape as the pre-registry extractor: the schema's output
    // graph (document + fields) plus extractor metadata.
    const extractionResult: VendorExtractionResponse = {
      ...(extraction.json as VendorExtractionResponse),
      metadata: {
        extractor_name: `${extraction.provider}-${CATALOGUE_SLUG}-extractor`,
        extractor_model: extraction.model,
        extractor_version: EXTRACTOR_VERSION,
        extraction_timestamp: new Date().toISOString(),
      },
    }

    // ============================================================================
    // PERSIST SUCCESS — raw and normalized stored separately (T3.3)
    // ============================================================================

    const { error: updateError } = await markExtractionSucceeded(
      supabase,
      scanSessionId,
      {
        // Key kept byte-compatible with the pre-registry extractor.
        raw_payload: { gemini_raw: extraction.raw },
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

    // ============================================================================
    // RETURN SUCCESS
    // ============================================================================

    audit.completed({ scan_session_id: scanSessionId })
    return json(extractionResult, 200, req)

  } catch (err) {
    // ============================================================================
    // FAILURE RESPONSE
    // ============================================================================

    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const errorType = classifyError(err)
    audit.failed({ error: errorMessage, error_type: errorType })
    captureException(err, { tags: { function: FUNCTION_NAME, error_type: errorType } })

    // Update scan session with error — use scanSessionId captured before body was consumed (T3.2)
    if (scanSessionId) {
      try {
        await markExtractionFailed(supabase, scanSessionId, errorMessage, errorType)
      } catch (updateErr) {
        audit.failedStateUpdateWarning({ error: updateErr instanceof Error ? updateErr.message : 'Unknown error' })
      }
    }

    return internalError(errorMessage, 'Extraction failed', req)
  }
})
