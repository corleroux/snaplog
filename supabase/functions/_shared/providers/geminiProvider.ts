/**
 * Gemini extraction provider (FR-MOD-01).
 *
 * ALL Gemini specifics live in this module: the schema-driven prompt, the
 * generateContent request body, response parsing and schema-driven
 * normalisation. No other module may build Gemini prompts, call the Gemini
 * API or normalise Gemini output — feature code goes through the
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
import type {
  CatalogueSchema,
  SchemaField,
  SchemaGroup,
} from '../catalogueSchemaRegistry.ts'
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

const TRANSLATION_BLOCK = `IMPORTANT TRANSLATION REQUIREMENT:
- If the image contains Chinese text, you MUST translate ALL extracted information to English
- Return ONLY English translated text in the JSON response
- Disregard the original Chinese characters - do not include them in your response
- All field values must be in English, even if the source text is in Chinese`

// ============================================================================
// PROMPT (schema-driven)
// ============================================================================

/**
 * Build the extraction prompt from a catalogue schema. Mirrors the legacy
 * hardcoded prompts: intro line, scan-type guidance, JSON structure skeleton
 * rendered from the field paths, translation block, rules.
 */
export function buildPrompt(schema: CatalogueSchema, scanType?: string): string {
  const guidance = (scanType ? schema.schema.scan_types?.[scanType] : undefined) || ''

  const sections: string[] = [
    `You are a textile trade fair ${schema.slug} data extraction assistant.`,
    '',
    guidance,
    '',
    'Extract the following information from this image and return ONLY a JSON object with this exact structure:',
    '',
    renderRootObject(schema.schema.fields),
  ]

  if (schema.schema.translate_to_english) {
    sections.push('', TRANSLATION_BLOCK)
  }

  const rules = schema.schema.rules
  if (rules && rules.length > 0) {
    sections.push('', 'Rules:', ...rules.map((rule) => `- ${rule}`))
  }

  return sections.join('\n')
}

/** Render the root JSON skeleton, e.g. `{ "style": { ... } }`. */
function renderRootObject(fields: SchemaField[]): string {
  return ['{', ...renderObjectBody(fields, 1), '}'].join('\n')
}

/**
 * Render the body lines of one object level from field paths. Paths with a
 * shared first segment (style.item_code, style.variants, ...) collapse into
 * a nested object keyed by that segment; single-segment paths render
 * directly. Entries are comma-joined like the legacy prompts.
 */
function renderObjectBody(fields: SchemaField[], indentLevel: number): string[] {
  const entries: string[][] = []
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
      entries.push(renderFieldEntry(field, indentLevel))
    }
  }

  const indent = '  '.repeat(indentLevel)
  for (const head of nestedOrder) {
    const groupFields = nested.get(head)
    if (!groupFields) continue
    entries.push([
      `${indent}"${head}": {`,
      ...renderObjectBody(groupFields, indentLevel + 1),
      `${indent}}`,
    ])
  }

  return joinEntries(entries)
}

/**
 * Render one field entry as one or more lines, at the given indent level.
 * Scalar/object fields are a single descriptor line; group fields and arrays
 * of groups render a nested skeleton block like the legacy prompts.
 */
function renderFieldEntry(field: SchemaField, indentLevel: number): string[] {
  const indent = '  '.repeat(indentLevel)
  const key = field.path.split('.').pop() || field.path

  if (field.type === 'group') {
    return [
      `${indent}"${key}": {`,
      ...renderObjectBody(field.fields ?? [], indentLevel + 1),
      `${indent}}`,
    ]
  }

  if (field.type === 'array') {
    const items = field.items
    if (items && (items as SchemaGroup).type === 'group') {
      const groupFields = (items as SchemaGroup).fields ?? []
      const inner = '  '.repeat(indentLevel + 1)
      return [
        `${indent}"${key}": [`,
        `${inner}{`,
        ...renderObjectBody(groupFields, indentLevel + 2),
        `${inner}}`,
        `${indent}] or null`,
      ]
    }
    return [`${indent}"${key}": ${renderScalarArrayDescriptor(field)}`]
  }

  // Legacy prompt shape: scalar descriptors are quoted strings
  // ("item_code": "string or null (...)"), object descriptors are not
  // ("metadata": {} or null (...)).
  const descriptor = renderDescriptor(field)
  const quoted = field.type === 'object' ? descriptor : `"${descriptor}"`
  return [`${indent}"${key}": ${quoted}`]
}

/**
 * Descriptor for a scalar array, e.g. `["array of brand names shown"] or null`
 * (legacy vendor prompt parity).
 */
function renderScalarArrayDescriptor(field: SchemaField): string {
  const items = field.items
  const fallback = items && (items as SchemaField).type
    ? `array of ${(items as SchemaField).type}s`
    : 'array of values'
  return `["${field.hint || fallback}"] or null`
}

/**
 * Descriptor for a scalar/object field, e.g. `string or null (style name)` or
 * `string (required - the main company name)` (legacy prompt parity).
 */
function renderDescriptor(field: SchemaField): string {
  if (field.type === 'object') {
    return `{} or null${parenthetical(field)}`
  }
  if (field.required) {
    const describe = describeList(field)
    return describe ? `${field.type} (required - ${describe})` : `${field.type} (required)`
  }
  return `${field.type} or null${parenthetical(field)}`
}

/** ` (hint; one of: a, b)` — hint plus allowed values, when present. */
function parenthetical(field: SchemaField): string {
  const describe = describeList(field)
  return describe ? ` (${describe})` : ''
}

/** `hint; one of: a, b` — hint plus allowed values, when present. */
function describeList(field: SchemaField): string {
  const parts: string[] = []
  if (field.hint) parts.push(field.hint)
  if (field.allowed_values && field.allowed_values.length > 0) {
    parts.push(`one of: ${field.allowed_values.map((v) => String(v)).join(', ')}`)
  }
  return parts.join('; ')
}

/** Comma-join rendered entries; the last entry has no trailing comma. */
function joinEntries(entries: string[][]): string[] {
  const lines: string[] = []
  entries.forEach((entry, entryIndex) => {
    const isLast = entryIndex === entries.length - 1
    entry.forEach((line, lineIndex) => {
      const isEntryEnd = lineIndex === entry.length - 1
      lines.push(isEntryEnd && !isLast ? `${line},` : line)
    })
  })
  return lines
}

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
// SCHEMA-DRIVEN NORMALISATION
// ============================================================================

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Normalise a parsed Gemini JSON response against a catalogue schema.
 *
 * The model is asked to nest fields under the schema's output_root
 * ("style"/"document"); a flat legacy response (pre-registry vendor prompt)
 * is still accepted. Every schema field is present in the result — missing
 * or malformed values are null (or '' for required strings), never filled
 * in (FR-EXT-06).
 */
export function normaliseModelOutput(
  parsed: unknown,
  schema: CatalogueSchema
): Record<string, unknown> {
  const container = resolveOutputContainer(parsed, schema.schema.output_root)
  return buildFieldGraph(container, schema.schema.fields)
}

/**
 * Resolve the object the schema fields read from. Prefers the output_root
 * key; falls back to a flat (legacy) response shape.
 */
function resolveOutputContainer(
  parsed: unknown,
  outputRoot: string | undefined
): Record<string, unknown> {
  if (!isPlainObject(parsed)) return {}
  if (outputRoot && parsed[outputRoot] !== undefined) {
    const rootValue = parsed[outputRoot]
    return isPlainObject(rootValue) ? rootValue : {}
  }
  return parsed
}

/**
 * Build the output graph from field paths, reading leaf values from the
 * container. `style.item_code` reads container.item_code and writes
 * graph.style.item_code — path prefixes are output structure, not container
 * traversal.
 */
function buildFieldGraph(
  container: Record<string, unknown>,
  fields: SchemaField[]
): Record<string, unknown> {
  const graph: Record<string, unknown> = {}
  for (const field of fields) {
    const segments = field.path.split('.')
    const leafKey = segments[segments.length - 1]
    const value = normaliseValue(container[leafKey], field)
    setAtPath(graph, segments, value)
  }
  return graph
}

function setAtPath(target: Record<string, unknown>, segments: string[], value: unknown): void {
  let node: Record<string, unknown> = target
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    const existing = node[segment]
    const child: Record<string, unknown> = isPlainObject(existing) ? existing : {}
    node[segment] = child
    node = child
  }
  node[segments[segments.length - 1]] = value
}

/**
 * Normalise one value against its schema field. Parity with the legacy
 * per-field normalisers: optional strings are trimmed or null; required
 * strings are trimmed or ''; numbers/booleans are kept only when the model
 * already returned that type; objects pass through only as plain objects.
 */
function normaliseValue(value: unknown, field: SchemaField): unknown {
  switch (field.type) {
    case 'string':
      if (field.required) {
        return value ? String(value).trim() : ''
      }
      return value ? String(value).trim() : null
    case 'number':
      return typeof value === 'number' ? value : null
    case 'boolean':
      return typeof value === 'boolean' ? value : null
    case 'object':
      return isPlainObject(value) ? value : null
    case 'group':
      return value
        ? buildFieldGraph(isPlainObject(value) ? value : {}, field.fields ?? [])
        : null
    case 'array':
      return normaliseArrayValue(value, field)
    default:
      return null
  }
}

function normaliseArrayValue(value: unknown, field: SchemaField): unknown {
  if (!Array.isArray(value)) return null

  const items = field.items
  if (items && (items as SchemaGroup).type === 'group') {
    const groupFields = (items as SchemaGroup).fields ?? []
    return value.map((item) => buildFieldGraph(isPlainObject(item) ? item : {}, groupFields))
  }

  const itemType = items && (items as SchemaField).type
  if (itemType === 'number') {
    return value.filter((item) => typeof item === 'number')
  }
  if (itemType === 'boolean') {
    return value.filter((item) => typeof item === 'boolean')
  }
  // Legacy brand_names behaviour: trim and drop empty entries. null items
  // are dropped instead of being coerced to the literal string "null".
  return value
    .map((item) => (item ? String(item).trim() : ''))
    .filter((item) => item !== '')
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
