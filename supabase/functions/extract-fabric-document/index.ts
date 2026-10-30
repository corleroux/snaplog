/**
 * extract-fabric-document
 *
 * Extracts structured textile data from uploaded fabric/product source images.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MAY read scan_sessions
 * - MAY read source images from storage
 * - MAY call Gemini
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
import { markExtractionProcessing, markExtractionSucceeded, markExtractionFailed } from '../_shared/scanSession.ts'
import { createExtractAudit } from '../_shared/extractAudit.ts'
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
// GEMINI INTEGRATION
// ============================================================================

const EXTRACTOR_VERSION = '1.0.0'
const EXTRACTOR_NAME = 'gemini-fabric-extractor'

async function callGemini(
  imageBase64: string,
  mimeType: string,
  scanType: string
): Promise<{ result: FabricExtractionResponse; rawText: string }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const prompt = buildFabricExtractionPrompt(scanType)
  const { callGeminiWithRetry, getGeminiUrl } = await import('../_shared/geminiClient.ts')

  const response = await callGeminiWithRetry(
    getGeminiUrl(apiKey),
    {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    audit.extractionFailed({ status: response.status, error: errorText })
    throw new Error(`Gemini API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    throw new Error('Empty response from Gemini')
  }

  // Parse the JSON response
  let parsed: { style?: unknown }
  try {
    parsed = JSON.parse(rawText)
  } catch (parseError) {
    throw new Error(`Failed to parse Gemini extraction response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
  }

  return {
    result: {
      style: normalizeExtractedStyle(parsed),
      metadata: {
        extractor_name: EXTRACTOR_NAME,
        extractor_model: 'gemini-flash-lite-latest',
        extractor_version: EXTRACTOR_VERSION,
        extraction_timestamp: new Date().toISOString(),
      },
    },
    rawText,
  }
}

function buildFabricExtractionPrompt(scanType: string): string {
  const scanTypeGuidance: Record<string, string> = {
    product_tag: 'This is a product tag. Extract style code, name, composition, and any variant/color information.',
    stock_sheet: 'This is a stock sheet. Focus on item codes, variants, quantities, and inventory information.',
    fabric_card: 'This is a fabric card or swatch card. Extract all specifications including composition, weight, width, and construction.',
    multi_variant_sheet: 'This shows multiple variants. Extract the main style info and all variants with their specific attributes.',
  }

  const guidance = scanTypeGuidance[scanType] || ''

  return `You are a textile trade fair fabric data extraction assistant.

${guidance}

Extract the following information from this image and return ONLY a JSON object with this exact structure:

{
  "style": {
    "item_code": "string or null (style/product code)",
    "name": "string or null (style name)",
    "composition": "string or null (fiber content, e.g., '100% Cotton', '80% Cotton 20% Polyester')",
    "category": "string or null (product category)",
    "construction": "string or null (weave/knit type, e.g., 'Plain Weave', 'Jersey Knit')",
    "finish": "string or null (surface finish)",
    "pattern": "string or null (pattern type, e.g., 'Solid', 'Stripe', 'Floral')",
    "width_cm": "number or null (width in centimeters)",
    "width_in": "number or null (width in inches)",
    "weight_gsm": "number or null (weight in grams per square meter)",
    "weight_ozsy": "number or null (weight in ounces per square yard)",
    "season": "string or null (season code like SS25, FW25)",
    "metadata": {} or null (any additional info as object),
    "variants": [
      {
        "color_code": "string or null (color code)",
        "color_name": "string or null (color name)",
        "variant_name": "string or null (custom variant description)",
        "wash_code": "string or null (wash code for denim)",
        "finish_override": "string or null (variant-specific finish)",
        "quantity": "number or null (observed stock quantity)",
        "unit": "string or null (unit like 'meters', 'yards', 'pieces')",
        "batch_no": "string or null (batch/lot number)",
        "metadata": {} or null,
        "price": {
          "currency": "string or null (e.g., 'USD', 'EUR')",
          "price": "number or null (price value)",
          "price_unit": "string or null (price unit like 'meter', 'yard')",
          "minimum_order_quantity": "number or null",
          "minimum_order_unit": "string or null",
          "lead_time_value": "number or null",
          "lead_time_unit": "string or null (e.g., 'days', 'weeks')",
          "notes": "string or null"
        }
      }
    ] or null
  }
}

IMPORTANT TRANSLATION REQUIREMENT:
- If the image contains Chinese text, you MUST translate ALL extracted information to English
- Return ONLY English translated text in the JSON response
- Disregard the original Chinese characters - do not include them in your response
- All field values must be in English, even if the source text is in Chinese

Rules:
- All numeric fields should be numbers, not strings
- If information is not visible, use null
- For variants, extract all color/size/wash variations visible and translate to English
- For prices, extract currency, amount, and unit clearly
- Weight and width should be numeric values in both metric and imperial if shown
- Return ONLY valid JSON, no markdown formatting
- Item code is the most important field - extract it carefully
- TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response`
}

function normalizeExtractedStyle(raw: unknown): ExtractedStylePayload {
  const data = raw as Record<string, unknown>
  const style = data.style as Record<string, unknown> | undefined

  if (!style) {
    return {
      variants: null,
    }
  }

  return {
    item_code: style.item_code ? String(style.item_code).trim() : null,
    name: style.name ? String(style.name).trim() : null,
    composition: style.composition ? String(style.composition).trim() : null,
    category: style.category ? String(style.category).trim() : null,
    construction: style.construction ? String(style.construction).trim() : null,
    finish: style.finish ? String(style.finish).trim() : null,
    pattern: style.pattern ? String(style.pattern).trim() : null,
    width_cm: typeof style.width_cm === 'number' ? style.width_cm : null,
    width_in: typeof style.width_in === 'number' ? style.width_in : null,
    weight_gsm: typeof style.weight_gsm === 'number' ? style.weight_gsm : null,
    weight_ozsy: typeof style.weight_ozsy === 'number' ? style.weight_ozsy : null,
    season: style.season ? String(style.season).trim() : null,
    metadata: style.metadata as Record<string, unknown> | null || null,
    variants: Array.isArray(style.variants)
      ? (style.variants as unknown[]).map(normalizeExtractedVariant)
      : null,
  }
}

function normalizeExtractedVariant(raw: unknown): ExtractedVariantPayload {
  const data = raw as Record<string, unknown>
  const price = data.price as Record<string, unknown> | undefined

  return {
    color_code: data.color_code ? String(data.color_code).trim() : null,
    color_name: data.color_name ? String(data.color_name).trim() : null,
    variant_name: data.variant_name ? String(data.variant_name).trim() : null,
    wash_code: data.wash_code ? String(data.wash_code).trim() : null,
    finish_override: data.finish_override ? String(data.finish_override).trim() : null,
    quantity: typeof data.quantity === 'number' ? data.quantity : null,
    unit: data.unit ? String(data.unit).trim() : null,
    batch_no: data.batch_no ? String(data.batch_no).trim() : null,
    metadata: data.metadata as Record<string, unknown> | null || null,
    price: price ? normalizeExtractedPrice(price) : null,
  }
}

function normalizeExtractedPrice(raw: Record<string, unknown>): ExtractedPricePayload {
  return {
    currency: raw.currency ? String(raw.currency).trim() : null,
    price: typeof raw.price === 'number' ? raw.price : null,
    price_unit: raw.price_unit ? String(raw.price_unit).trim() : null,
    minimum_order_quantity: typeof raw.minimum_order_quantity === 'number' ? raw.minimum_order_quantity : null,
    minimum_order_unit: raw.minimum_order_unit ? String(raw.minimum_order_unit).trim() : null,
    lead_time_value: typeof raw.lead_time_value === 'number' ? raw.lead_time_value : null,
    lead_time_unit: raw.lead_time_unit ? String(raw.lead_time_unit).trim() : null,
    notes: raw.notes ? String(raw.notes).trim() : null,
  }
}

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
    const { result: extractionResult, rawText } = await callGemini(
      imageBase64,
      body.mime_type,
      body.scan_type
    )

    // ============================================================================
    // PERSIST SUCCESS — raw and normalized stored separately (T3.3)
    // ============================================================================

    const { error: updateError } = await markExtractionSucceeded(
      supabase,
      scanSessionId,
      {
        raw_payload: { gemini_raw: rawText },
        normalized_payload: extractionResult,
        metadata: extractionResult.metadata,
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
