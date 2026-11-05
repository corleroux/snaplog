/**
 * Schema-driven extraction prompt builder.
 *
 * Provider-agnostic: everything here is derived from the catalogue schema
 * registry — no model API knowledge. Introduced with the Gemini provider
 * (FR-MOD-01) and hoisted into this shared module in FR-MOD-02a so every
 * provider (Gemini, Muse Spark, the Modal open-weights model) builds the
 * exact same prompt: intro line, scan-type guidance, JSON structure
 * skeleton rendered from the field paths, translation block, rules.
 *
 * Feature code never imports this module directly — prompts are built
 * inside provider modules behind the ExtractionProvider interface.
 */

import type {
  CatalogueSchema,
  SchemaField,
  SchemaGroup,
} from '../catalogueSchemaRegistry.ts'

const TRANSLATION_BLOCK = `IMPORTANT TRANSLATION REQUIREMENT:
- If the image contains Chinese text, you MUST translate ALL extracted information to English
- Return ONLY English translated text in the JSON response
- Disregard the original Chinese characters - do not include them in your response
- All field values must be in English, even if the source text is in Chinese`

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
