/**
 * Gemini extraction provider (FR-MOD-01).
 *
 * ALL Gemini specifics live in this module: the generateContent request
 * body, the legacy generation config and response parsing. The
 * schema-driven prompt and output normalisation are provider-agnostic and
 * live in ./extractionPrompt.ts and ./extractionNormaliser.ts (introduced
 * here in FR-MOD-01, hoisted to shared modules in FR-MOD-02a so Muse Spark
 * and the Modal open-weights provider reuse them verbatim). No other module
 * may call the Gemini API — feature code goes through the
 * ExtractionProvider interface in ./types.ts.
 *
 * Prompt parity with the pre-registry extractors (extract-fabric-document /
 * extract-vendor-document at FR-SCH-01):
 * - generation config: temperature 0.1, maxOutputTokens 4096,
 *   responseMimeType application/json (vendor previously used 2048 output
 *   tokens; unified at 4096, which only raises the output ceiling).
 * - the scan-type guidance line, translation block and rules come verbatim
 *   from the schema registry (migration 083).
 * - normalisation semantics: strings trimmed, numbers kept only when the
 *   model already returned a number, everything else null — never defaults
 *   (FR-EXT-06).
 *
 * Known cosmetic differences vs the legacy hardcoded prompts, inherited from
 * the seeded schema (migration 083): hint quotes use " instead of ', rules
 * carry trailing periods, and a few price/variant hint lines gained their
 * parenthesised hint. Guidance text, structure and rules content are exact.
 */

import { callGeminiWithRetry, getGeminiModel, getGeminiUrl } from '../geminiClient.ts'
import { buildPrompt } from './extractionPrompt.ts'
import { normaliseModelOutput } from './extractionNormaliser.ts'
import type { CatalogueSchema } from '../catalogueSchemaRegistry.ts'
import type {
  ExtractionProvider,
  ExtractionRequest,
  ExtractionResult,
  ProviderImage,
  ProviderUsage,
} from './types.ts'

const PROVIDER_NAME = 'gemini'

// Preserved from the pre-registry extractors (prompt parity).
const GENERATION_CONFIG = {
  temperature: 0.1,
  maxOutputTokens: 4096,
  responseMimeType: 'application/json',
} as const

// ============================================================================
// REQUEST BODY
// ============================================================================

/**
 * Build the generateContent request body. Kept byte-compatible with the
 * pre-registry extractors: prompt text part first, then inline image parts,
 * with the legacy generation config.
 */
export function buildRequestBody(
  prompt: string,
  images: ProviderImage[]
): Record<string, unknown> {
  return {
    contents: [{
      parts: [
        { text: prompt },
        ...images.map((image) => ({
          inline_data: {
            mime_type: image.mimeType,
            data: image.base64,
          },
        })),
      ],
    }],
    generationConfig: { ...GENERATION_CONFIG },
  }
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

interface GeminiResponseShape {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

/**
 * Extract the raw text and token usage from a generateContent response.
 * Throws the same errors as the pre-registry extractors.
 */
export function parseGeminiResponse(data: unknown): { rawText: string; usage: ProviderUsage | null } {
  const response = (data ?? {}) as GeminiResponseShape
  const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    throw new Error('Empty response from Gemini')
  }

  const usageMetadata = response.usageMetadata
  if (!usageMetadata) {
    return { rawText, usage: null }
  }

  const usage: ProviderUsage = {}
  if (typeof usageMetadata.promptTokenCount === 'number') {
    usage.inputTokens = usageMetadata.promptTokenCount
  }
  if (typeof usageMetadata.candidatesTokenCount === 'number') {
    usage.outputTokens = usageMetadata.candidatesTokenCount
  }
  return { rawText, usage }
}

// ============================================================================
// PROVIDER
// ============================================================================

export const geminiProvider: ExtractionProvider = {
  name: PROVIDER_NAME,

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    if (request.images.length === 0) {
      throw new Error('At least one image is required for extraction')
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const prompt = buildPrompt(request.schema, request.scanType)
    const body = buildRequestBody(prompt, request.images)

    const startedAt = Date.now()
    const response = await callGeminiWithRetry(getGeminiUrl(apiKey), body)
    const latencyMs = Date.now() - startedAt

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.status} ${errorText}`)
    }

    const data: unknown = await response.json()
    const { rawText, usage } = parseGeminiResponse(data)

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch (parseError) {
      throw new Error(
        `Failed to parse Gemini extraction response as JSON: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`
      )
    }

    return {
      json: normaliseModelOutput(parsed, request.schema),
      raw: rawText,
      provider: PROVIDER_NAME,
      model: getGeminiModel(),
      usage,
      latencyMs,
      // Gemini reports no field-level confidences; FR-EXT-06 flagging uses
      // the null/missing-value markers in the normalised output.
      confidences: null,
    }
  },
}
