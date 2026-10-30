/**
 * Style Mappers - App-facing <-> Persistence-facing conversion
 *
 * Case mapping constants, row <-> record conversion functions,
 * and helper utilities for the style domain.
 */

import type { StyleRecord } from '@/types/style'
import type { StyleImageRecord, StyleExtractionMeta } from '@/types/style'
import { safeParseJsonb, fabricWarningsSchema } from '@/lib/validation/jsonbSchemas'
import { storagePathToPublicUrl, isSignedUrl } from '@/lib/upload/storageUrls'

/**
 * App-facing Style domain types for repository operations
 */

export interface StyleCreateInput {
  vendorId: string
  styleName: string
  composition: string
  color: string
  weight: string
  width: string
  price: string
  sku: string
  supplierRef: string
  notes: string
  images: StyleImageRecord[]
  sourceInfoImageId?: string
  extractionMeta?: {
    extractedAt: string
    warnings: string[]
  }
}

export interface StyleUpdateInput {
  styleName?: string
  composition?: string
  color?: string
  weight?: string
  width?: string
  price?: string
  sku?: string
  supplierRef?: string
  notes?: string
  isShortlisted?: boolean
  images?: StyleImageRecord[]
}

/**
 * Persistence-facing fabric_* structure types
 * These match the Supabase schema with lifecycle fields
 */

export interface FabricStyleRow {
  id: string
  event_id: string
  vendor_id: string
  item_code?: string | null
  name?: string | null
  composition?: string | null
  category?: string | null
  construction?: string | null
  finish?: string | null
  pattern?: string | null
  width_cm?: number | null
  width_in?: number | null
  weight_gsm?: number | null
  weight_ozsy?: number | null
  season?: string | null
  supplier_ref?: string | null
  source_info_image_id?: string | null
  extracted_at?: string | null
  extraction_status?: string | null
  extraction_warnings?: unknown
  extraction_confidence?: number | null
  status: 'active' | 'sample' | 'discontinued'
  is_shortlisted?: boolean | null
  metadata?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface FabricImageRow {
  id: string
  style_id?: string | null
  variant_id?: string | null
  vendor_id: string
  event_id: string
  storage_path: string
  public_url?: string | null
  image_role: 'thumbnail' | 'gallery' | 'swatch' | 'scan_original' | 'detail'
  is_primary: boolean
  display_order?: number | null
  caption?: string | null
  was_source_info_image?: boolean | null
  width?: number | null
  height?: number | null
  file_size_bytes?: number | null
  mime_type?: string | null
  created_at: string
}

/**
 * Mapper functions: App-facing <-> Persistence-facing
 */

/**
 * Convert app-facing StyleRecord to persistence-facing fabric_styles row
 */
export function styleRecordToFabricStyleRow(record: StyleRecord): FabricStyleRow {
  return {
    id: record.id,
    event_id: '', // Will be populated by repository
    vendor_id: record.vendorId,
    item_code: record.sku || null,
    name: record.styleName || null,
    composition: record.composition || null,
    category: record.category || null,
    construction: null,
    finish: null,
    pattern: null,
    width_cm: parseMeasurement(record.width, 'cm'),
    width_in: parseMeasurement(record.width, 'in'),
    weight_gsm: parseWeight(record.weight, 'gsm'),
    weight_ozsy: parseWeight(record.weight, 'ozsy'),
    season: record.season || null,
    status: (record.status as FabricStyleRow['status']) || 'active',
    metadata: null,
    created_at: record.createdAt,
    updated_at: record.createdAt,
  }
}

/**
 * Convert persistence-facing fabric_styles row to app-facing StyleRecord
 */
export function fabricStyleRowToStyleRecord(
  row: FabricStyleRow,
  images: FabricImageRow[] = [],
  latestPrice?: { price: number; currency: string; priceUnit: string } | null
): StyleRecord {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    styleName: row.name || '',
    composition: row.composition || '',
    color: '', // Not in fabric_styles, comes from variants
    weight: formatWeight(row.weight_gsm ?? null, row.weight_ozsy ?? null),
    width: formatWidth(row.width_cm ?? null, row.width_in ?? null),
    price: '', // Not in fabric_styles, comes from price_history
    latestPrice: latestPrice ?? null,
    sku: row.item_code || '',
    supplierRef: row.supplier_ref || '',
    notes: '', // Notes could be stored in metadata
    category: row.category || undefined,
    season: row.season || undefined,
    status: row.status || undefined,
    isShortlisted: row.is_shortlisted ?? false,
    images: (images ?? []).map(fabricImageToStyleImage),
    sourceInfoImageId: row.source_info_image_id || images.find(i => i.was_source_info_image)?.id,
    createdAt: row.created_at,
    extractionMeta: extractExtractionMetaFromStyleRow(row),
  }
}

/**
 * Extract extraction metadata from fabric_styles row (if present)
 */
function extractExtractionMetaFromStyleRow(row: FabricStyleRow): StyleExtractionMeta | undefined {
  const extractedAt = row.extracted_at
  const parsed = safeParseJsonb(fabricWarningsSchema, row.extraction_warnings, 'extraction_warnings')

  if (!extractedAt && !parsed) {
    return undefined
  }

  return {
    extractedAt: extractedAt || new Date().toISOString(),
    warnings: parsed || [],
  }
}

/**
 * Convert persistence-facing fabric_images row to app-facing StyleImageRecord
 */
export function fabricImageToStyleImage(row: FabricImageRow): StyleImageRecord {
  // Use public_url if it's a valid (non-signed) URL, otherwise generate from storage_path
  const uri = row.public_url && !isSignedUrl(row.public_url)
    ? row.public_url
    : storagePathToPublicUrl(row.storage_path)

  return {
    id: row.id,
    uri,
    caption: row.caption || undefined,
  }
}

/**
 * Helper: Parse width string to number
 */
function parseMeasurement(value: string, _unit: 'cm' | 'in'): number | null {
  if (!value) return null
  const match = value.match(/(\d+(?:\.\d+)?)\s*(cm|in)?/i)
  if (!match) return null
  return parseFloat(match[1])
}

/**
 * Helper: Parse weight string to number
 */
function parseWeight(value: string, _unit: 'gsm' | 'ozsy'): number | null {
  if (!value) return null
  const match = value.match(/(\d+(?:\.\d+)?)\s*(gsm|g\/m²|oz\/yd²|ozsy)?/i)
  if (!match) return null
  return parseFloat(match[1])
}

/**
 * Helper: Format width for display
 */
function formatWidth(cm: number | null, inches: number | null): string {
  if (cm) return `${cm} cm`
  if (inches) return `${inches} in`
  return ''
}

/**
 * Helper: Format weight for display
 */
function formatWeight(gsm: number | null, ozsy: number | null): string {
  if (gsm) return `${gsm} GSM`
  if (ozsy) return `${ozsy} oz/yd²`
  return ''
}
