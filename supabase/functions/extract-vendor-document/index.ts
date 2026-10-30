/**
 * extract-vendor-document
 *
 * Extracts structured vendor data from vendor-identifying images.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MAY read scan_sessions
 * - MAY read source images from storage
 * - MAY call Gemini
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
import { markExtractionProcessing, markExtractionSucceeded, markExtractionFailed } from '../_shared/scanSession.ts'
import { createExtractAudit } from '../_shared/extractAudit.ts'
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
// GEMINI INTEGRATION
// ============================================================================

const EXTRACTOR_VERSION = '1.0.0'
const EXTRACTOR_NAME = 'gemini-vendor-extractor'

async function callGemini(
  imageBase64: string,
  mimeType: string,
  scanType: string
): Promise<{ result: VendorExtractionResponse; rawText: string }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const prompt = buildVendorExtractionPrompt(scanType)
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
        maxOutputTokens: 2048,
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
  let parsed: ExtractedVendorDocument
  try {
    parsed = JSON.parse(rawText)
  } catch (parseError) {
    throw new Error(`Failed to parse Gemini extraction response as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`)
  }

  return {
    result: {
      document: normalizeExtractedVendor(parsed),
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

function buildVendorExtractionPrompt(scanType: string): string {
  const scanTypeGuidance: Record<string, string> = {
    vendor_card: 'This is a business card. Extract company name, contact details, and any brand information.',
    vendor_signage: 'This is booth signage. Focus on company name, booth number, and brand names.',
    vendor_brochure: 'This is a brochure. Extract all company, contact, and product information visible.',
    vendor_catalog: 'This is a catalog cover. Extract company name, brands, and any contact information.',
  }

  const guidance = scanTypeGuidance[scanType] || ''

  return `You are a textile trade fair vendor data extraction assistant.

${guidance}

Extract the following information from this image and return ONLY a JSON object with this exact structure:

{
  "company_name": "string (required - the main company name)",
  "booth_number": "string or null (booth/stan number if visible)",
  "contact_person": "string or null (name of contact person)",
  "email": "string or null (email address)",
  "phone": "string or null (phone number with country code if available)",
  "whatsapp": "string or null (WhatsApp number if shown separately)",
  "website_url": "string or null (website URL)",
  "address": "string or null (physical address)",
  "country_of_origin": "string or null (country where the vendor is based)",
  "brand_names": ["array of brand names shown"] or null,
  "notes": "string or null (any other relevant information)"
}

IMPORTANT TRANSLATION REQUIREMENT:
- If the image contains Chinese text, you MUST translate ALL extracted information to English
- Return ONLY English translated text in the JSON response
- Disregard the original Chinese characters - do not include them in your response
- All field values must be in English, even if the source text is in Chinese

Rules:
- company_name is REQUIRED and must never be null
- If information is not visible in the image, use null
- For brand_names, extract all brand/textile brand logos visible and translate to English
- Phone numbers should include the country code if visible (e.g., +86 for China)
- Websites should start with https:// if implied
- Return ONLY valid JSON, no markdown formatting
- TRANSLATE ALL CHINESE TEXT TO ENGLISH before including in the JSON response
}`
}

function normalizeExtractedVendor(raw: unknown): ExtractedVendorDocument {
  const data = raw as Record<string, unknown>

  return {
    company_name: String(data.company_name || '').trim(),
    booth_number: data.booth_number ? String(data.booth_number).trim() : null,
    contact_person: data.contact_person ? String(data.contact_person).trim() : null,
    email: data.email ? String(data.email).trim() : null,
    phone: data.phone ? String(data.phone).trim() : null,
    whatsapp: data.whatsapp ? String(data.whatsapp).trim() : null,
    website_url: data.website_url ? String(data.website_url).trim() : null,
    address: data.address ? String(data.address).trim() : null,
    country_of_origin: data.country_of_origin ? String(data.country_of_origin).trim() : null,
    brand_names: Array.isArray(data.brand_names)
      ? (data.brand_names as string[]).map(b => String(b).trim()).filter(Boolean)
      : null,
    notes: data.notes ? String(data.notes).trim() : null,
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
