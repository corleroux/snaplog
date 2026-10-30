/**
 * Schema-driven extraction output normaliser.
 *
 * Provider-agnostic: normalises a parsed model JSON response against a
 * catalogue schema from the registry — no model API knowledge. Introduced
 * with the Gemini provider (FR-MOD-01) and hoisted into this shared module
 * in FR-MOD-02a so every provider normalises identically: strings trimmed,
 * numbers kept only when the model already returned a number, everything
 * else null — never defaults (FR-EXT-06). Low-confidence or missing fields
 * stay null/'' and are flagged for review; a provider must never fill them
 * in.
 *
 * Feature code never imports this module directly — normalisation runs
 * inside provider modules behind the ExtractionProvider interface.
 */

import type {
  CatalogueSchema,
  SchemaField,
  SchemaGroup,
} from '../catalogueSchemaRegistry.ts'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Normalise a parsed model JSON response against a catalogue schema.
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
