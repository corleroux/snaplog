/**
 * Muse Spark extraction provider (FR-MOD-02a), via the Meta Model API.
 *
 * ALL Muse Spark / Meta Model API specifics live in this module: the chat
 * completions request body (Bearer MODEL_API_KEY, data-URL image parts,
 * JSON-schema response_format), response parsing, timeout and retry.
 * Feature code goes through the ExtractionProvider interface in ./types.ts
 * and getProvider(); it never imports this module directly.
 *
 * API shape (verified against the Meta Model API docs, Oct 2026):
 * - POST https://api.meta.ai/v1/chat/completions — OpenAI-compatible.
 * - Auth: `Authorization: Bearer <MODEL_API_KEY>`.
 * - Images: `{type:"image_url", image_url:{url:"data:<mime>;base64,<bytes>"}}`
 *   content parts in a single user message (images are only processed in
 *   user-role messages; up to 50 per request).
 * - Structured output: `response_format: {type:"json_schema", json_schema:
 *   {name, schema}}` — the Chat Completions parameter (text.format is
 *   Responses-only and is rejected here). Decoding is constrained to the
 *   schema. `strict` is omitted: it defaults to false, output is
 *   schema-constrained either way, and the strict subset's
 *   additionalProperties:false rule is incompatible with our free-form
 *   metadata fields. Recursive schemas are rejected (HTTP 400) — the schema
 *   derived here is fixed-depth by construction (no $ref, registry fields
 *   only), well inside the depth-10 / 5,000-property limits.
 * - Sampling: temperature and top_p are left unset — Muse Spark is tuned to
 *   its defaults and the docs recommend clearer instructions over lowering
 *   temperature. `max_completion_tokens` caps the output; Muse Spark is a
 *   reasoning model, so reasoning tokens share the completion budget.
 *
 * Prompt and normalisation come from the shared schema-driven modules
 * (./extractionPrompt.ts, ./extractionNormaliser.ts) introduced with the
 * Gemini provider in FR-MOD-01 — same translation block and null rules, so
 * normalised payloads are identical across providers.
 *
 * Mode rule (owner directive): Standard `muse-spark-1.3` (the default) for
 * vendor-card PII, the benchmark and the demo. Contributor mode
 * (`muse-spark-1.3-contributor`, ~12x cheaper) may send prompts to Meta
 * training — only for dev iterations on non-PII images (garments, swatches).
 * The FR-MOD-04 benchmark runner hard-pins Standard mode in code.
 */

import type {
  CatalogueSchema,
  SchemaField,
  SchemaGroup,
} from '../catalogueSchemaRegistry.ts'
import { buildPrompt } from './extractionPrompt.ts'
import { normaliseModelOutput } from './extractionNormaliser.ts'
import type {
  ExtractionProvider,
  ExtractionRequest,
  ExtractionResult,
  ProviderImage,
  ProviderUsage,
} from './types.ts'

const PROVIDER_NAME = 'muse-spark'

// Standard mode — content is not used to train Meta models (see the mode
// rule above). muse-spark-1.1 (also Standard) is a proven fallback.
const DEFAULT_MODEL = 'muse-spark-1.3'

const CHAT_COMPLETIONS_URL = 'https://api.meta.ai/v1/chat/completions'

// Muse Spark is a reasoning model: reasoning tokens and the JSON payload
// share the completion budget, so the ceiling is higher than the Gemini
// provider's 4096 output tokens.
const MAX_COMPLETION_TOKENS = 8192

// Timeout: 60 seconds (reasoning model — more headroom than Gemini's 30s).
const MUSE_SPARK_TIMEOUT_MS = 60000

// Retry: 2 retries with exponential backoff (5s, 15s) on transient network
// errors only — mirrors the Gemini client. HTTP error statuses are surfaced
// to the caller; provider fallback is FR-MOD-03.
const MAX_RETRIES = 2
const BASE_RETRY_DELAY_MS = 5000

const RETRYABLE_ERROR_PATTERNS = [
  'econnreset',
  'etimedout',
  'enotfound',
  'connection reset',
  'connection timeout',
  'network',
  'fetch failed',
]

/**
 * The configured Muse Spark model. Exported so the provider can report the
 * exact model used for each extraction run (FR-MOD-01/FR-MOD-02a).
 */
export function getMuseSparkModel(): string {
  return Deno.env.get('MUSE_SPARK_MODEL') || DEFAULT_MODEL
}

// ============================================================================
// JSON SCHEMA DERIVATION (registry schema -> response_format json_schema)
// ============================================================================

/**
 * Derive the JSON Schema sent as `response_format.json_schema.schema` from
 * a catalogue schema. Mirrors the prompt skeleton exactly: multi-segment
 * field paths (style.item_code) collapse into nested objects; group fields
 * and arrays of groups become nested objects; every property is listed in
 * `required` so the model emits explicit nulls instead of omitting keys —
 * the normaliser treats both shapes identically. Optional fields are
 * nullable (`type: ["string", "null"]`); registry-required fields are not.
 */
export function buildResponseSchema(schema: CatalogueSchema): Record<string, unknown> {
  return {
    type: 'object',
    properties: renderProperties(schema.schema.fields),
    required: requiredKeys(schema.schema.fields),
  }
}

/**
 * Render the properties map for one object level from field paths, using
 * the same first-segment collapsing as the prompt builder.
 */
function renderProperties(fields: SchemaField[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  const nested = new Map<string, SchemaField[]>()
  const nestedOrder: string[] = []

  for (const field of fields) {
    const segments = field.path.split('.')
    if (segments.length > 1) {
      const head = segments[0]
      const child: SchemaField = { ...field, path: segments.slice(1).join('.') }
      let groupFields = nested.get(head)
      if (!groupFields) {
        groupFields = []
        nested.set(head, groupFields)
        nestedOrder.push(head)
      }
      groupFields.push(child)
    } else {
      properties[field.path] = renderPropertySchema(field)
    }
  }

  for (const head of nestedOrder) {
    const groupFields = nested.get(head)
    if (!groupFields) continue
    properties[head] = {
      type: 'object',
      properties: renderProperties(groupFields),
      required: requiredKeys(groupFields),
    }
  }

  return properties
}

/** The required-key list for one object level: direct keys, then collapsed heads. */
function requiredKeys(fields: SchemaField[]): string[] {
  const keys: string[] = []
  const nested = new Set<string>()
  for (const field of fields) {
    const segments = field.path.split('.')
    if (segments.length > 1) {
      nested.add(segments[0])
    } else {
      keys.push(segments[0])
    }
  }
  return [...keys, ...nested]
}

/** Render the JSON Schema for one single-segment field. */
function renderPropertySchema(field: SchemaField): Record<string, unknown> {
  const description = field.hint || field.label

  switch (field.type) {
    case 'group':
      return {
        type: nullableType('object', field),
        description,
        properties: renderProperties(field.fields ?? []),
        required: requiredKeys(field.fields ?? []),
      }
    case 'array':
      return {
        type: nullableType('array', field),
        description,
        items: renderItemsSchema(field),
      }
    case 'object':
      // Free-form object (e.g. metadata): no properties declared, so the
      // model may return any JSON object.
      return { type: nullableType('object', field), description }
    default:
      return renderScalarSchema(field, description)
  }
}

/**
 * Render the JSON Schema for a scalar field: nullable unless the registry
 * marks it required; allowed_values become an enum (plus null when
 * nullable).
 */
function renderScalarSchema(
  field: SchemaField,
  description: string
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    type: nullableType(field.type, field),
    description,
  }
  if (field.allowed_values && field.allowed_values.length > 0) {
    schema.enum = field.required
      ? [...field.allowed_values]
      : [...field.allowed_values, null]
  }
  return schema
}

/**
 * Render the JSON Schema for array items, mirroring the normaliser's
 * item handling: group items become objects, number/boolean items keep
 * their type, everything else (including string arrays like brand_names)
 * is a string item.
 */
function renderItemsSchema(field: SchemaField): Record<string, unknown> {
  const items = field.items
  if (items && (items as SchemaGroup).type === 'group') {
    const groupFields = (items as SchemaGroup).fields ?? []
    return {
      type: 'object',
      properties: renderProperties(groupFields),
      required: requiredKeys(groupFields),
    }
  }

  const itemType = items && (items as SchemaField).type
  if (itemType === 'number' || itemType === 'boolean') {
    return { type: itemType }
  }
  return { type: 'string' }
}

/** `type` for a field: plain when required, `[type, "null"]` otherwise. */
function nullableType(type: string, field: SchemaField): string | string[] {
  return field.required ? type : [type, 'null']
}

/** Stable json_schema name, e.g. `fabric-extraction-v1`. */
function schemaName(schema: CatalogueSchema): string {
  return `${schema.slug}-extraction-v${schema.version}`
}

// ============================================================================
// REQUEST BODY
// ============================================================================

/**
 * Build the chat completions request body: one user message with the
 * schema-driven prompt text part followed by data-URL image parts, plus the
 * JSON-schema response format derived from the registry schema.
 */
export function buildRequestBody(
  prompt: string,
  images: ProviderImage[],
  schema: CatalogueSchema
): Record<string, unknown> {
  return {
    model: getMuseSparkModel(),
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...images.map((image) => ({
            type: 'image_url',
            image_url: { url: `data:${image.mimeType};base64,${image.base64}` },
          })),
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: schemaName(schema),
        schema: buildResponseSchema(schema),
      },
    },
    // temperature / top_p intentionally unset — see module docstring.
    max_completion_tokens: MAX_COMPLETION_TOKENS,
  }
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

interface MuseSparkResponseShape {
  choices?: Array<{ message?: { content?: string | null } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/**
 * Extract the raw text and token usage from a chat completions response.
 * Structured output guarantees the content is a JSON string conforming to
 * the derived schema; anything empty is an error, never a guess.
 */
export function parseMuseSparkResponse(data: unknown): { rawText: string; usage: ProviderUsage | null } {
  const response = (data ?? {}) as MuseSparkResponseShape
  const rawText = response.choices?.[0]?.message?.content

  if (!rawText) {
    throw new Error('Empty response from Muse Spark')
  }

  const reported = response.usage
  if (!reported) {
    return { rawText, usage: null }
  }

  const usage: ProviderUsage = {}
  if (typeof reported.prompt_tokens === 'number') {
    usage.inputTokens = reported.prompt_tokens
  }
  if (typeof reported.completion_tokens === 'number') {
    usage.outputTokens = reported.completion_tokens
  }
  return { rawText, usage }
}

// ============================================================================
// HTTP (timeout + transient retry, mirroring the Gemini client)
// ============================================================================

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return RETRYABLE_ERROR_PATTERNS.some((p) => msg.includes(p))
}

async function withTimeout<T>(
  promise: (signal: AbortSignal) => Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)

  try {
    return await promise(controller.signal)
  } catch (err) {
    if (controller.signal.aborted) throw new Error(message)
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Call the Meta Model API with timeout and retry on transient network
 * errors. HTTP error statuses are returned as-is and surfaced by the
 * caller.
 */
async function callMuseSparkWithRetry(
  url: string,
  body: Record<string, unknown>,
  apiKey: string
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        (signal) =>
          fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
          }),
        MUSE_SPARK_TIMEOUT_MS,
        `Muse Spark API request timed out after ${MUSE_SPARK_TIMEOUT_MS}ms`
      )

      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Don't retry on last attempt
      if (attempt === MAX_RETRIES) break

      // Only retry transient errors (network, timeout)
      if (!isRetryableError(err)) throw err

      // Exponential backoff: 5s, 15s
      const delay = BASE_RETRY_DELAY_MS * Math.pow(3, attempt)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

// ============================================================================
// PROVIDER
// ============================================================================

export const museSparkProvider: ExtractionProvider = {
  name: PROVIDER_NAME,

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    if (request.images.length === 0) {
      throw new Error('At least one image is required for extraction')
    }

    const apiKey = Deno.env.get('MODEL_API_KEY')
    if (!apiKey) {
      throw new Error('MODEL_API_KEY is not configured')
    }

    const prompt = buildPrompt(request.schema, request.scanType)
    const body = buildRequestBody(prompt, request.images, request.schema)

    const startedAt = Date.now()
    const response = await callMuseSparkWithRetry(CHAT_COMPLETIONS_URL, body, apiKey)
    const latencyMs = Date.now() - startedAt

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Muse Spark API error: ${response.status} ${errorText}`)
    }

    const data: unknown = await response.json()
    const { rawText, usage } = parseMuseSparkResponse(data)

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch (parseError) {
      throw new Error(
        `Failed to parse Muse Spark extraction response as JSON: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`
      )
    }

    return {
      json: normaliseModelOutput(parsed, request.schema),
      raw: rawText,
      provider: PROVIDER_NAME,
      model: getMuseSparkModel(),
      usage,
      latencyMs,
      // Muse Spark reports no field-level confidences; FR-EXT-06 flagging
      // uses the null/missing-value markers in the normalised output.
      confidences: null,
    }
  },
}
