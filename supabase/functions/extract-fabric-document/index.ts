/**
 * extract-fabric-document
 *
 * Extracts structured textile data from uploaded fabric/product source images.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MAY read scan_sessions
 * - MAY read source images from storage
 * - MAY call the extraction provider via _shared/providers (default: Gemini)
 * - MAY update scan_sessions.raw_payload
 * - MAY update scan_sessions.normalized_payload
 * - MAY update extraction_status and error fields
 * - MUST NOT write fabric_styles, fabric_variants, inventory_records, price_history, or fabric_images
 *
 * Fabric scan types:
 * - product_tag: individual product tags
 * - stock_sheet: stock/availability sheets
 * - fabric_card: fabric swatch/sample cards
 * - multi_variant_sheet: sheets showing multiple variants
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
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

// Validate environment at startup
const env = validateEnv()

const FUNCTION_NAME = 'extract-fabric-document'
const log = createLogger(FUNCTION_NAME)
const audit = createExtractAudit(log)

// ============================================================================
// TYPES
// ============================================================================

interface ExtractFabricRequest {
  scan_session_id: string
  event_id: string
  vendor_id: string
  storage_path: string
  mime_type: string
  scan_type: 'product_tag' | 'stock_sheet' | 'fabric_card' | 'multi_variant_sheet'
}

interface ExtractedPricePayload {
  currency?: string | null
  price?: number | null
  price_unit?: string | null
  minimum_order_quantity?: number | null
  minimum_order_unit?: string | null
  lead_time_value?: number | null
  lead_time_unit?: string | null
  notes?: string | null
}

interface ExtractedVariantPayload {
  color_code?: string | null
  color_name?: string | null
  variant_name?: string | null
  wash_code?: string | null
  finish_override?: string | null
  quantity?: number | null
  unit?: string | null
  batch_no?: string | null
  metadata?: Record<string, unknown> | null
  price?: ExtractedPricePayload | null
}

interface ExtractedStylePayload {
  item_code?: string | null
  name?: string | null
  composition?: string | null
  category?: string | null
  construction?: string | null
  finish?: string | null
  pattern?: string | null
  width_cm?: number | null
  width_in?: number | null
  weight_gsm?: number | null
  weight_ozsy?: number | null
  season?: string | null
  metadata?: Record<string, unknown> | null
  variants?: ExtractedVariantPayload[] | null
}

interface FabricExtractionMetadata {
  extractor_name: string
  extractor_model: string
  extractor_version: string
  confidence_scores?: Record<string, number>
  extraction_timestamp?: string
}

interface FabricExtractionResponse {
  style: ExtractedStylePayload
  metadata: FabricExtractionMetadata
}

// ============================================================================
// VALIDATION
// ============================================================================

const FABRIC_SCAN_TYPES = [
  'product_tag',
  'stock_sheet',
  'fabric_card',
  'multi_variant_sheet',
] as const

function validateFabricScanType(value: string): void {
  if (!FABRIC_SCAN_TYPES.includes(value as any)) {
    throw new Error(
      `Invalid scan_type: must be one of ${FABRIC_SCAN_TYPES.join(', ')}`
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
const CATALOGUE_SLUG = 'fabric'

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

    const body: ExtractFabricRequest = await req.json()
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
    if (!body.vendor_id) {
      audit.validationFailed({ error: 'vendor_id is required' })
      throw new Error('vendor_id is required')
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
    validateUUID(body.vendor_id, 'vendor_id')
    validateFabricScanType(body.scan_type)

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
    // graph (style + fields) plus extractor metadata.
    const extractionResult: FabricExtractionResponse = {
      ...(extraction.json as FabricExtractionResponse),
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
    audit.failed({ error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })

    // Update scan session with error — use scanSessionId captured before body was consumed (T3.2)
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
