import type { FabricStyle } from '@/lib/supabase/types'
import { styleRepository } from './styleRepository'

/**
 * Fetch fabric styles for a specific vendor.
 *
 * This function now uses the styleRepository for data access.
 * The repository provides the app-facing StyleRecord type while
 * mapping to the underlying fabric_styles table.
 *
 * Filters by event_id and vendor_id, orders by most recently created.
 * RLS is handled by Supabase policies in the database.
 *
 * @param eventId - The event ID
 * @param vendorId - The vendor ID
 * @returns Array of fabric styles (raw Supabase type for compatibility)
 */
export async function getStyles(
  eventId: string,
  vendorId: string
): Promise<FabricStyle[]> {
  // Use repository for data access
  const styleRecords = await styleRepository.getStylesByVendor(vendorId)

  // Map back to raw Supabase type for backward compatibility
  // TODO: Eventually update screens to use StyleRecord directly
  return styleRecords.map(s => ({
    id: s.id,
    event_id: eventId,
    vendor_id: s.vendorId,
    item_code: s.sku || '',
    name: s.styleName || null,
    composition: s.composition || null,
    category: null,
    construction: null,
    finish: null,
    width_cm: parseWidth(s.width),
    width_in: parseWidthInches(s.width),
    weight_gsm: parseWeight(s.weight),
    weight_ozsy: null,
    pattern: null,
    season: null,
    supplier_ref: s.supplierRef || null,
    source_info_image_id: s.sourceInfoImageId || null,
    extracted_at: s.extractionMeta?.extractedAt || null,
    extraction_status: s.extractionMeta ? 'complete' : null,
    extraction_warnings: s.extractionMeta?.warnings || [],
    extraction_confidence: null,
    source: s.extractionMeta ? 'ai' : 'manual',
    status: 'active' as const,
    deleted_at: null,
    metadata: null,
    is_shortlisted: false,
    created_by: '',
    updated_by: null,
    created_at: s.createdAt,
    updated_at: s.createdAt,
    version: 1,
  }))
}

// Helper: Parse width string to cm
function parseWidth(value: string): number | null {
  if (!value) return null
  const match = value.match(/(\d+(?:\.\d+)?)\s*cm/i)
  return match ? parseFloat(match[1]) : null
}

// Helper: Parse width string to inches
function parseWidthInches(value: string): number | null {
  if (!value) return null
  const match = value.match(/(\d+(?:\.\d+)?)\s*in/i)
  return match ? parseFloat(match[1]) : null
}

// Helper: Parse weight string to gsm
function parseWeight(value: string): number | null {
  if (!value) return null
  const match = value.match(/(\d+(?:\.\d+)?)\s*gsm/i)
  return match ? parseFloat(match[1]) : null
}
