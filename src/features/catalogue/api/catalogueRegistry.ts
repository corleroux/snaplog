/**
 * Catalogue schema registry client (FR-SCH-05).
 *
 * Reads active catalogue type definitions directly from the `catalogue_types`
 * table (RLS SELECT granted in FR-SCH-01) — no new endpoint. The capture and
 * review UI render entirely from these rows, so adding a category is a schema
 * row, never application code.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('CatalogueRegistry')

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
  items?: SchemaField | { type: 'group'; fields: SchemaField[] }
  fields?: SchemaField[]
}

export interface CatalogueTypeDefinition {
  slug: string
  kind: 'catalogue_type' | 'document'
  display_name: string
  version: number
  schema: {
    translate_to_english?: boolean
    rules?: string[]
    scan_types?: Record<string, string>
    output_root?: string
    fields: SchemaField[]
  }
}

/** Catalogue types the capture picker offers (order = display order). */
export const PICKER_ORDER = ['fabric', 'garment', 'vendor'] as const

// In-memory cache: registry rows change only via migrations.
let cache: CatalogueTypeDefinition[] | null = null

/**
 * Fetch all active catalogue type definitions, cached for the session.
 */
export async function getCatalogueTypes(): Promise<CatalogueTypeDefinition[]> {
  if (cache) {return cache}

  const { data, error } = await supabase
    .from('catalogue_types')
    .select('slug, kind, display_name, version, schema')
    .eq('is_active', true)
    .order('slug')

  if (error) {
    logger.error('Failed to load catalogue types', { error: error.message })
    throw new Error(`Failed to load catalogue types: ${error.message}`)
  }

  cache = (data ?? []) as CatalogueTypeDefinition[]
  return cache
}

/**
 * Fetch a single active definition by slug (latest version).
 */
export async function getCatalogueType(slug: string): Promise<CatalogueTypeDefinition> {
  const types = await getCatalogueTypes()
  const found = types
    .filter((t) => t.slug === slug)
    .sort((a, b) => b.version - a.version)[0]

  if (!found) {
    throw new Error(`Catalogue type "${slug}" not found`)
  }

  return found
}

/**
 * Clear the in-memory cache (tests, or after a known registry change).
 */
export function clearCatalogueTypeCache(): void {
  cache = null
}

/**
 * A field counts as missing when the extracted value is null, undefined,
 * an empty string, or an empty array — these stay flagged (FR-EXT-06),
 * never guessed.
 */
export function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) {return true}
  if (typeof value === 'string' && value.trim() === '') {return true}
  if (Array.isArray(value) && value.length === 0) {return true}
  return false
}

/**
 * Read a value out of the extraction payload by schema field path.
 * Paths are relative to the schema output root
 * (e.g. `item.garment_type` → payload.item.garment_type).
 */
export function readFieldValue(payload: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.')
  let current: unknown = payload
  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

/**
 * Write a value into a payload copy by schema field path.
 * Numeric segments address array indices (for variant/colourway rows).
 */
export function writeFieldValue(
  payload: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const copy: Record<string, unknown> = JSON.parse(JSON.stringify(payload))
  const segments = path.split('.')
  let current: Record<string, unknown> | unknown[] = copy
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    const nextSegment = segments[i + 1]
    const nextIsIndex = /^\d+$/.test(nextSegment)
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (current[index] === null || current[index] === undefined || typeof current[index] !== 'object') {
        current[index] = nextIsIndex ? [] : {}
      }
      current = current[index] as Record<string, unknown> | unknown[]
    } else {
      const next = (current as Record<string, unknown>)[segment]
      if (next === null || next === undefined || typeof next !== 'object') {
        ;(current as Record<string, unknown>)[segment] = nextIsIndex ? [] : {}
      }
      current = (current as Record<string, unknown>)[segment] as Record<string, unknown> | unknown[]
    }
  }
  const last = segments[segments.length - 1]
  if (Array.isArray(current)) {
    current[Number(last)] = value
  } else {
    ;(current as Record<string, unknown>)[last] = value
  }
  return copy
}

/**
 * Merge reviewer edits over a (possibly re-extracted) payload.
 * User edits always win — re-extraction never overwrites `reviewed_payload`.
 */
export function mergeReviewedEdits(
  extractionPayload: Record<string, unknown>,
  userEdits: Record<string, unknown>
): Record<string, unknown> {
  let merged = extractionPayload
  for (const [path, value] of Object.entries(userEdits)) {
    merged = writeFieldValue(merged, path, value)
  }
  return merged
}
