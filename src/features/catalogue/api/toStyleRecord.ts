/**
 * Map `catalogue_items` rows onto StyleRecord for the unified styles screen
 * (FR-CAT-01). Garment and video rows render as style cards alongside fabric
 * rows; fabric rendering is untouched.
 *
 * Ids are prefixed `ci-<uuid>` so the list wrapper can guard fabric-only
 * actions (detail navigation, shortlist) without touching fabric paths.
 */

import type { StyleRecord } from '@/types/style'
import { missingRatio, REVIEW_MISSING_RATIO } from './missingFields'

export interface CatalogueItemRow {
  id: string
  item_code: string
  name: string | null
  schema_type: string
  extracted_fields: Record<string, unknown>
  created_at: string
}

export interface CatalogueDisplayItem {
  record: StyleRecord
  needsReview: boolean
}

/**
 * One-line garment summary (moved from the removed vendor-page section).
 * The style card renders this as the secondary descriptor.
 */
export function summaryLine(item: Record<string, unknown>): string | null {
  const fields = item ?? {}
  const root = (fields.item ?? fields) as Record<string, unknown>
  const parts: string[] = []
  if (typeof root.garment_type === 'string' && root.garment_type) {parts.push(root.garment_type)}
  if (typeof root.fit === 'string' && root.fit) {parts.push(root.fit)}
  if (typeof root.sizing === 'string' && root.sizing) {parts.push(`Size ${root.sizing}`)}
  return parts.length > 0 ? parts.join(' · ') : null
}

/** Human label for a catalogue schema type — surfaces as a filter chip. */
export function categoryLabel(schemaType: string): string {
  switch (schemaType) {
    case 'garment':
      return 'Garment'
    case 'video':
      return 'Video'
    default: {
      const pretty = schemaType.replace(/[_-]+/g, ' ').trim()
      return pretty ? pretty.charAt(0).toUpperCase() + pretty.slice(1) : 'Item'
    }
  }
}

function firstColourName(root: Record<string, unknown>): string {
  const colourways = root.colourways
  if (Array.isArray(colourways) && colourways.length > 0) {
    const first = colourways[0] as Record<string, unknown>
    if (typeof first?.colour_name === 'string') {return first.colour_name}
  }
  return ''
}

/**
 * Map one catalogue_items row to a style-list record.
 * ALL searched string fields default to '' — the list screen calls
 * .toLowerCase() unguarded.
 */
export function toStyleRecord(
  row: CatalogueItemRow,
  thumbnailUrl: string | null,
  vendorId: string,
): CatalogueDisplayItem {
  const fields = row.extracted_fields ?? {}
  const root = ((fields.item ?? fields) as Record<string, unknown>) ?? {}
  const summary = summaryLine(fields) ?? ''

  return {
    record: {
      id: `ci-${row.id}`,
      vendorId,
      styleName: row.name?.trim() || row.item_code || 'Untitled Item',
      composition: summary,
      color: firstColourName(root),
      weight: '',
      width: '',
      price: '',
      latestPrice: null,
      sku: row.item_code || '',
      supplierRef: '',
      notes: '',
      category: categoryLabel(row.schema_type),
      status: 'active',
      isShortlisted: false,
      images: thumbnailUrl ? [{ id: `ci-img-${row.id}`, uri: thumbnailUrl }] : [],
      createdAt: row.created_at,
    },
    needsReview: missingRatio(fields) > REVIEW_MISSING_RATIO,
  }
}
