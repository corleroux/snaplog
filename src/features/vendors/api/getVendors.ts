import type { Vendor } from '@/lib/supabase/types'
import { vendorRepository } from './vendorRepository'

/**
 * Fetch vendors for a specific event.
 *
 * This function now uses the vendorRepository for data access.
 * The repository provides the app-facing VendorRecord type while
 * mapping to the underlying vendors table.
 *
 * Filters by event_id and orders by most recently created.
 * RLS is handled by Supabase policies in the database.
 *
 * @param eventId - The event ID to fetch vendors for
 * @returns Array of vendors (raw Supabase type for compatibility)
 */
export async function getVendors(eventId: string): Promise<Vendor[]> {
  // Use repository for data access
  const vendorRecords = await vendorRepository.getByEvent(eventId)

  // Map back to raw Supabase type for backward compatibility
  // TODO: Eventually update screens to use VendorRecord directly
  return vendorRecords.map(v => ({
    id: v.id,
    event_id: v.eventId,
    company_name: v.companyName,
    booth_number: v.boothNumber || null,
    contact_person: v.contactName || null,
    country_of_origin: v.countryOfOrigin || null,
    address: v.address || null,
    brand_names: v.brandNames ? v.brandNames.split(',').map(s => s.trim()).filter(Boolean) : [],
    email: v.email || null,
    phone: v.phone || null,
    whatsapp: null,
    website_url: v.website || null,
    notes: v.notes || null,
    source: v.extractionMeta ? 'ai' : 'manual',
    status: 'active' as const,
    created_by: '', // Would need to be added to VendorRecord
    updated_by: null,
    created_at: v.createdAt,
    updated_at: v.createdAt,
    // New lifecycle fields
    source_info_image_id: v.sourceInfoImageId || null,
    extracted_at: v.extractionMeta?.extractedAt || null,
    extraction_status: v.extractionMeta ? 'complete' : null,
    extraction_warnings: v.extractionMeta?.warnings || [],
    extraction_confidence: null,
    deleted_at: null,
    version: v.version,
  }))
}
