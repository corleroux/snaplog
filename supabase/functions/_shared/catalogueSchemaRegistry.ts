/**
 * catalogueSchemaRegistry
 *
 * Loads versioned catalogue schemas from the DB-backed registry.
 * - In-isolate cache: the same Deno isolate may reuse this module across
 *   requests, so loaded schemas are memoized.
 * - Shape validation: every returned schema must have a non-empty field list
 *   and recognised field types.
 *
 * This module is the single source of truth for extraction prompts,
 * review UIs, and Modal jobs.
 */

import { createAdminClient } from './supabase.ts'

export type SchemaFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'group'

export interface SchemaField {
  path: string
  type: SchemaFieldType
  label: string
  hint?: string
  required?: boolean
  allowed_values?: unknown[]
  items?: SchemaField | SchemaGroup
  fields?: SchemaField[]
}

export interface SchemaGroup {
  type: 'group'
  fields: SchemaField[]
}

export interface CatalogueSchema {
  slug: string
  kind: 'catalogue_type' | 'document'
  display_name: string
  version: number
  schema: {
    translate_to_english?: boolean
    scan_types?: Record<string, string>
    output_root?: string
    fields: SchemaField[]
  }
}

interface RawCatalogueType {
  slug: string
  kind: 'catalogue_type' | 'document'
  display_name: string
  version: number
  schema: CatalogueSchema['schema']
}

const VALID_FIELD_TYPES: SchemaFieldType[] = [
  'string',
  'number',
  'boolean',
  'array',
  'object',
  'group',
]

// In-isolate cache. Deno isolates are single-threaded and may be reused across
// requests, so a module-level Map is safe and avoids repeated DB round-trips.
const cache = new Map<string, CatalogueSchema>()

function cacheKey(slug: string, version?: number): string {
  return version === undefined ? `${slug}:latest` : `${slug}:v${version}`
}

function validateField(field: unknown, pathPrefix = ''): SchemaField {
  if (!field || typeof field !== 'object') {
    throw new Error(`Schema field at "${pathPrefix}" must be an object`)
  }

  const f = field as Record<string, unknown>

  if (typeof f.path !== 'string' || f.path.length === 0) {
    throw new Error(`Schema field at "${pathPrefix}" must have a non-empty "path"`)
  }

  if (typeof f.type !== 'string' || !VALID_FIELD_TYPES.includes(f.type as SchemaFieldType)) {
    throw new Error(
      `Schema field "${f.path}" has invalid type "${f.type}". ` +
      `Valid types: ${VALID_FIELD_TYPES.join(', ')}`
    )
  }

  if (typeof f.label !== 'string' || f.label.length === 0) {
    throw new Error(`Schema field "${f.path}" must have a non-empty "label"`)
  }

  const typedField = f as SchemaField

  if (typedField.type === 'array') {
    if (typedField.items) {
      if (typedField.items.type === 'group') {
        validateGroup(typedField.items as SchemaGroup, typedField.path)
      }
      // scalar item type is allowed; no further validation needed
    }
  }

  if (typedField.type === 'group') {
    validateGroup(typedField as unknown as SchemaGroup, typedField.path)
  }

  return typedField
}

function validateGroup(group: SchemaGroup, pathPrefix = ''): void {
  if (!group || typeof group !== 'object') {
    throw new Error(`Schema group at "${pathPrefix}" must be an object`)
  }

  if (!Array.isArray(group.fields) || group.fields.length === 0) {
    throw new Error(`Schema group at "${pathPrefix}" must have a non-empty "fields" array`)
  }

  for (const field of group.fields) {
    validateField(field, pathPrefix)
  }
}

function validateSchema(raw: RawCatalogueType): CatalogueSchema {
  const schema = raw.schema

  if (!schema || typeof schema !== 'object') {
    throw new Error(`Schema for "${raw.slug}" must be an object`)
  }

  if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
    throw new Error(`Schema for "${raw.slug}" must have a non-empty "fields" array`)
  }

  for (const field of schema.fields) {
    validateField(field, raw.slug)
  }

  return {
    slug: raw.slug,
    kind: raw.kind,
    display_name: raw.display_name,
    version: raw.version,
    schema,
  }
}

/**
 * Load a schema by slug. If version is omitted, returns the highest active
 * version for that slug.
 */
export async function loadSchema(
  slug: string,
  version?: number
): Promise<CatalogueSchema> {
  const key = cacheKey(slug, version)
  const cached = cache.get(key)
  if (cached) {
    return cached
  }

  const supabase = createAdminClient()

  let query = supabase
    .from('catalogue_types')
    .select('slug, kind, display_name, version, schema')
    .eq('slug', slug)
    .eq('is_active', true)

  if (version !== undefined) {
    query = query.eq('version', version)
  } else {
    query = query.order('version', { ascending: false }).limit(1)
  }

  const { data, error } = await query.single<RawCatalogueType>()

  if (error) {
    throw new Error(`Failed to load schema "${slug}": ${error.message}`)
  }

  if (!data) {
    throw new Error(`Schema "${slug}" not found`)
  }

  const validated = validateSchema(data)
  cache.set(key, validated)
  return validated
}

/**
 * Clear the in-isolate cache. Useful in tests and after a known schema change.
 */
export function clearSchemaCache(): void {
  cache.clear()
}
