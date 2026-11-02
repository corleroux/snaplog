/**
 * Catalogue item detail query (FR-CAT-01).
 *
 * Loads one active `catalogue_items` row scoped to its vendor, plus active
 * variants, thumbnails from `scan_sessions`, and the registry definition for
 * schema-driven field rendering and EXT-06 warnings.
 *
 * Throws on item failure (unknown id, wrong vendor, RLS) so the screen can
 * render its error state; variants/thumbnails/definition degrade to empty.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import {
  getCatalogueType,
  readFieldValue,
  type CatalogueTypeDefinition,
} from '../api/catalogueRegistry'
import { missingRatio, REVIEW_MISSING_RATIO } from '../api/missingFields'
import { buildExtractionWarnings } from './useCatalogueItemCaptureFlow'
import { resolveThumbnailUrl } from './useCatalogueItemsQuery'
import type { CatalogueItemRow } from '../api/toStyleRecord'

const logger = createLogger('CatalogueItemDetail')

export interface CatalogueItemVariantRow {
  id: string
  variant_name: string | null
  colour_code: string | null
  colour_name: string | null
  sizing: string | null
  status: string
}

export interface CatalogueItemField {
  label: string
  value: string
}

export interface CatalogueItemDetailData {
  item: CatalogueItemRow
  variants: CatalogueItemVariantRow[]
  imageUrls: string[]
  definition: CatalogueTypeDefinition | null
  fields: CatalogueItemField[]
  warnings: string[]
  needsReview: boolean
}

export const catalogueItemDetailKeys = {
  all: ['catalogue-item-detail'] as const,
  byId: (vendorId: string, itemId: string) =>
    [...catalogueItemDetailKeys.all, vendorId, itemId] as const,
}

function formatPrimitive(value: unknown): string | null {
  if (value === null || value === undefined) {return null}
  if (typeof value === 'string') {return value.trim() === '' ? null : value}
  if (typeof value === 'number' || typeof value === 'boolean') {return String(value)}
  return null
}

function prettifyKey(key: string): string {
  const pretty = key.replace(/[_-]+/g, ' ').trim()
  return pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : key
}

async function fetchDetail(vendorId: string, itemId: string): Promise<CatalogueItemDetailData> {
  const { data: item, error: itemError } = await supabase
    .from('catalogue_items')
    .select('id, item_code, name, schema_type, schema_version, extracted_fields, created_at')
    .eq('id', itemId)
    .eq('vendor_id', vendorId)
    .eq('status', 'active')
    .maybeSingle()

  if (itemError) {
    logger.error('Failed to load catalogue item', { error: itemError.message })
    throw new Error('Failed to load item')
  }
  if (!item) {
    throw new Error('Item not found')
  }

  const row = {
    ...(item as Omit<CatalogueItemRow, 'schema_version'> & { schema_version: number }),
  } as CatalogueItemRow
  const flatFields = ((row.extracted_fields as Record<string, unknown> | null) ?? {}) as Record<string, unknown>

  let variants: CatalogueItemVariantRow[] = []
  try {
    const { data: variantRows, error: variantsError } = await supabase
      .from('catalogue_item_variants')
      .select('id, variant_name, colour_code, colour_name, sizing, status')
      .eq('item_id', itemId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
    if (variantsError) {
      logger.warn('Failed to load catalogue item variants', { error: variantsError.message })
    } else {
      variants = (variantRows ?? []) as CatalogueItemVariantRow[]
    }
  } catch (err) {
    logger.warn('Failed to load catalogue item variants', { error: String(err) })
  }

  const imageUrls: string[] = []
  try {
    const { data: scans, error: scansError } = await supabase
      .from('scan_sessions')
      .select('item_id, source_image_url, source_image_path')
      .eq('item_id', itemId)
    if (scansError) {
      logger.warn('Failed to load catalogue item images', { error: scansError.message })
    } else {
      const seen = new Set<string>()
      for (const scan of (scans ?? []) as Array<{
        item_id: string | null
        source_image_url: string | null
        source_image_path: string | null
      }>) {
        const url = resolveThumbnailUrl(scan)
        if (url && !seen.has(url)) {
          seen.add(url)
          imageUrls.push(url)
        }
      }
    }
  } catch (err) {
    logger.warn('Failed to load catalogue item images', { error: String(err) })
  }

  let definition: CatalogueTypeDefinition | null = null
  try {
    definition = await getCatalogueType(row.schema_type)
  } catch (err) {
    logger.warn('Failed to load catalogue type definition', { error: String(err) })
  }

  let fields: CatalogueItemField[] = []
  let warnings: string[] = []
  if (definition) {
    const outputRoot = definition.schema.output_root ?? 'item'
    const envelope = { [outputRoot]: flatFields } as Record<string, unknown>
    fields = definition.schema.fields
      .filter((f) => f.type !== 'array' && f.type !== 'object' && f.type !== 'group')
      .map((f) => {
        const relative = f.path.startsWith(`${outputRoot}.`)
          ? f.path.slice(outputRoot.length + 1)
          : f.path
        const formatted = formatPrimitive(readFieldValue(flatFields, relative))
        return {
          label: f.label,
          value: formatted ?? 'Not extracted',
        }
      })
    try {
      warnings = buildExtractionWarnings(envelope, definition)
    } catch (err) {
      logger.warn('Failed to build extraction warnings', { error: String(err) })
    }
  } else {
    fields = Object.entries(flatFields)
      .filter(([, value]) => formatPrimitive(value) !== null)
      .map(([key, value]) => ({
        label: prettifyKey(key),
        value: formatPrimitive(value) ?? 'Not extracted',
      }))
  }

  return {
    item: row,
    variants,
    imageUrls,
    definition,
    fields,
    warnings,
    needsReview: missingRatio(flatFields) > REVIEW_MISSING_RATIO,
  }
}

export function useCatalogueItemDetail(vendorId: string, itemId: string) {
  return useQuery({
    queryKey: catalogueItemDetailKeys.byId(vendorId, itemId),
    queryFn: () => fetchDetail(vendorId, itemId),
    enabled: !!vendorId && !!itemId,
    staleTime: 2 * 60 * 1000, // 2 minutes — matches the list queries
  })
}
