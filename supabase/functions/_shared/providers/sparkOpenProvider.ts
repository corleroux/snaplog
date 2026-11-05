/**
 * Muse Spark Open extraction provider (FR-MOD-02b), via Modal's Shared Endpoint.
 *
 * ALL Modal / Muse Spark Open specifics live in this module: the
 * OpenAI-compatible chat completions request body (Bearer MODAL_PROXY_TOKEN,
 * data-URL image parts, JSON-schema response_format with a prompted-JSON
 * fallback), response parsing, timeout and retry. Feature code goes through
 * the ExtractionProvider interface in ./types.ts and getProvider(); it never
 * imports this module directly.
 *
 * Endpoint shape (verified Oct 2026 via Modal docs + models.dev):
 * - Shared inference requires a CREATED endpoint: `modal endpoint create
 *   --shared --model <id>` (or the dashboard Endpoints tab) prints a
 *   per-endpoint URL; calls go to `<endpoint-url>/v1/chat/completions`.
 *   The bare regional host 404s with "unknown inference model" (probe).
 *   SPARK_OPEN_BASE_URL overrides the default regional base with the
 *   created endpoint's `<scheme>://<host>/v1` prefix.
 * - Auth: `Authorization: Bearer <MODAL_PROXY_TOKEN>` — a Modal Proxy Token
 *   (wk-<id>.ws-<secret>, Settings → Proxy Auth Tokens). A plain Modal API
 *   key (ak-...) is rejected with 401; verified by probe.
 * - Model: `meta-models/Muse-Spark-Open-816B-A42B` (override: SPARK_OPEN_MODEL).
 * - Structured output: supported per models.dev; sources disagree (litellm
 *   says no), so if the endpoint rejects `response_format` the provider
 *   retries once as prompted-JSON and parses defensively. The shared
 *   normaliser treats both shapes identically.
 * - Pricing: $1.25/$4.25 per Mtok (.costUsd lands with FR-MOD-04 pricing).
 *
 * Prompt and normalisation come from the shared schema-driven modules
 * (./extractionPrompt.ts, ./extractionNormaliser.ts) — same translation
 * block and null rules as every other provider, so normalised payloads are
 * identical across providers.
 *
 * This is a Meta open-weights model served on partner infrastructure: the
 * demo write-up carries the "Built with Muse Spark Open" attribution.
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

const PROVIDER_NAME = 'muse-spark-open'

// Open-weights model served on Modal's shared endpoint. Override for
// experiments only (e.g. a quant variant); the benchmark pins this default.
const DEFAULT_MODEL = 'meta-models/Muse-Spark-Open-816B-A42B'

// Modal's regional OpenAI-compatible base. Overridable because shared
// inference calls go to the per-endpoint URL printed by
// `modal endpoint create --shared` (or the dashboard Endpoints tab):
// set SPARK_OPEN_BASE_URL to that URL's <scheme>://<host>/v1 prefix.
const DEFAULT_BASE_URL = 'https://inference.us-west.modal.direct/v1'

/**
 * The Modal endpoint base URL (no trailing path). Exported so tests can pin
 * the request URL and operators can point at a created endpoint.
 */
export function getSparkOpenBaseUrl(): string {
  return (Deno.env.get('SPARK_OPEN_BASE_URL') || DEFAULT_BASE_URL).replace(/\/+$/, '')
}

// Muse Spark Open is a reasoning model: reasoning tokens and the JSON payload
// share the completion budget — same 8192 ceiling as muse-spark.
const MAX_COMPLETION_TOKENS = 8192

// Timeout: 60 seconds (reasoning model on shared infra).
const SPARK_OPEN_TIMEOUT_MS = 60000

// Retry: 2 retries with exponential backoff (5s, 15s) on transient network
// errors only — mirrors the other providers. HTTP error statuses are
// surfaced to the caller; provider fallback is FR-MOD-03.
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
 * The configured Muse Spark Open model. Exported so the provider can report
 * the exact model used for each extraction run (FR-MOD-01/FR-MOD-02b).
 */
export function getSparkOpenModel(): string {
  return Deno.env.get('SPARK_OPEN_MODEL') || DEFAULT_MODEL
}

// ============================================================================
// JSON SCHEMA DERIVATION (registry schema -> response_format json_schema)
// ============================================================================
// Same derivation as the muse-spark provider: shared response_format shape,
// fixed-depth, every property required so the model emits explicit nulls.
// Kept local (not imported) so each provider module stays self-contained —
// a Modal-side schema change must never silently alter the Meta API calls.

/**
 * Derive the JSON Schema sent as `response_format.json_schema.schema` from
 * a catalogue schema.
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
 * Render the JSON Schema for array items: group items become objects,
 * number/boolean items keep their type, everything else is a string item.
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
 * JSON-schema response format derived from the registry schema. Pass
 * `withStructuredOutput: false` for the prompted-JSON fallback.
 */
export function buildRequestBody(
  prompt: string,
  images: ProviderImage[],
  schema: CatalogueSchema,
  withStructuredOutput = true
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: getSparkOpenModel(),
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
    // temperature / top_p intentionally unset — reasoning model defaults.
    max_completion_tokens: MAX_COMPLETION_TOKENS,
  }

  if (withStructuredOutput) {
    body.response_format = {
      type: 'json_schema',
      json_schema: {
        name: schemaName(schema),
        schema: buildResponseSchema(schema),
      },
    }
  }

  return body
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

interface SparkOpenResponseShape {
  choices?: Array<{ message?: { content?: string | null } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

/**
 * Extract the raw text and token usage from a chat completions response.
 * Anything empty is an error, never a guess.
 */
export function parseSparkOpenResponse(data: unknown): { rawText: string; usage: ProviderUsage | null } {
  const response = (data ?? {}) as SparkOpenResponseShape
  const rawText = response.choices?.[0]?.message?.content

  if (!rawText) {
    throw new Error('Empty response from Muse Spark Open')
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

/**
 * Parse prompted-JSON fallback output: strip markdown fences when the
 * endpoint ignored the JSON-only instruction, then parse. Transport
 * cleanup only — field values still go through the shared normaliser,
 * which nulls unknowns instead of guessing.
 */
export function parsePromptedJson(rawText: string): unknown {
  const trimmed = rawText.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  const candidate = fenced ? fenced[1] : trimmed
  return JSON.parse(candidate)
}

// ============================================================================
// HTTP (timeout + transient retry, mirroring the other providers)
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
 * Call the Modal shared endpoint with timeout and retry on transient
 * network errors. HTTP error statuses are returned as-is and surfaced by
 * the caller.
 */
async function callSparkOpenWithRetry(
  url: string,
  body: Record<string, unknown>,
  proxyToken: string
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        (signal) =>
          fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${proxyToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal,
          }),
        SPARK_OPEN_TIMEOUT_MS,
        `Muse Spark Open API request timed out after ${SPARK_OPEN_TIMEOUT_MS}ms`
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

/**
 * The endpoint rejects `response_format` with 400 (or 422) when structured
 * output is unavailable — retry once as prompted JSON. Any other status is
 * surfaced. Message matching covers the known phrasings; unknown 4xx shapes
 * surface as errors rather than guessing a retry.
 */
export function isStructuredOutputRejection(status: number, bodyText: string): boolean {
  if (status !== 400 && status !== 422) return false
  const lowered = bodyText.toLowerCase()
  return lowered.includes('response_format') ||
    lowered.includes('json_schema') ||
    lowered.includes('structured') ||
    lowered.includes('unprocessable')
}

// ============================================================================
// PROVIDER
// ============================================================================

export const sparkOpenProvider: ExtractionProvider = {
  name: PROVIDER_NAME,

  async extract(request: ExtractionRequest): Promise<ExtractionResult> {
    if (request.images.length === 0) {
      throw new Error('At least one image is required for extraction')
    }

    const proxyToken = Deno.env.get('MODAL_PROXY_TOKEN')
    if (!proxyToken) {
      throw new Error('MODAL_PROXY_TOKEN is not configured')
    }

    const prompt = buildPrompt(request.schema, request.scanType)
    const chatCompletionsUrl = `${getSparkOpenBaseUrl()}/chat/completions`

    const startedAt = Date.now()
    let response = await callSparkOpenWithRetry(
      chatCompletionsUrl,
      buildRequestBody(prompt, request.images, request.schema),
      proxyToken
    )

    // Prompted-JSON fallback when structured output is rejected.
    if (!response.ok) {
      const errorText = await response.text()
      if (isStructuredOutputRejection(response.status, errorText)) {
        response = await callSparkOpenWithRetry(
          chatCompletionsUrl,
          buildRequestBody(prompt, request.images, request.schema, false),
          proxyToken
        )
        if (!response.ok) {
          const retryText = await response.text()
          throw new Error(`Muse Spark Open API error: ${response.status} ${retryText}`)
        }
        const data: unknown = await response.json()
        const { rawText, usage } = parseSparkOpenResponse(data)
        let parsed: unknown
        try {
          parsed = parsePromptedJson(rawText)
        } catch (parseError) {
          throw new Error(
            `Failed to parse Muse Spark Open extraction response as JSON: ${
              parseError instanceof Error ? parseError.message : String(parseError)
            }`
          )
        }
        return {
          json: normaliseModelOutput(parsed, request.schema),
          raw: rawText,
          provider: PROVIDER_NAME,
          model: getSparkOpenModel(),
          usage,
          latencyMs: Date.now() - startedAt,
          confidences: null,
        }
      }
      throw new Error(`Muse Spark Open API error: ${response.status} ${errorText}`)
    }

    const latencyMs = Date.now() - startedAt
    const data: unknown = await response.json()
    const { rawText, usage } = parseSparkOpenResponse(data)

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
    } catch (parseError) {
      throw new Error(
        `Failed to parse Muse Spark Open extraction response as JSON: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`
      )
    }

    return {
      json: normaliseModelOutput(parsed, request.schema),
      raw: rawText,
      provider: PROVIDER_NAME,
      model: getSparkOpenModel(),
      usage,
      latencyMs,
      // No field-level confidences; FR-EXT-06 flagging uses the
      // null/missing-value markers in the normalised output.
      confidences: null,
    }
  },
}
