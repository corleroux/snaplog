/**
 * Vendor Comparison Stats API
 *
 * Fetches per-vendor statistics for an event suitable for use in VendorComparison.
 */

import { supabase } from '@/lib/supabase/client'
import type { VendorStats } from '../VendorComparison'

/**
 * Fetch vendor comparison stats for all vendors in an event.
 */
export async function getVendorComparisonStats(eventId: string): Promise<VendorStats[]> {
  // Fetch event name + vendors with style counts in parallel
  const [eventResult, vendorsResult, imagesResult] = await Promise.all([
    supabase.from('events').select('name').eq('id', eventId).single(),
    supabase
      .from('vendors')
      .select('id, name, booth_number, fabric_styles(id)')
      .eq('event_id', eventId),
    supabase
      .from('fabric_images')
      .select('vendor_id')
      .eq('event_id', eventId),
  ])

  if (vendorsResult.error) throw vendorsResult.error

  const eventName = eventResult.data?.name ?? ''
  const vendors = vendorsResult.data ?? []

  // Build image count lookup by vendor_id
  const imageCountByVendor: Record<string, number> = {}
  for (const img of imagesResult.data ?? []) {
    if (img.vendor_id) {
      imageCountByVendor[img.vendor_id] = (imageCountByVendor[img.vendor_id] ?? 0) + 1
    }
  }

  return vendors.map((vendor) => ({
    vendorId: vendor.id,
    vendorName: vendor.name,
    eventId,
    eventName,
    boothNumber: vendor.booth_number,
    totalStyles: (vendor.fabric_styles as { id: string }[] | null)?.length ?? 0,
    totalVariants: 0, // variants require a deeper join; omitted here
    totalImages: imageCountByVendor[vendor.id] ?? 0,
  }))
}
