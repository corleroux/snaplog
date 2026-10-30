/**
 * Event Stats API
 *
 * Functions for fetching analytics and statistics for events.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Event statistics for a single event
 */
export interface EventStats {
  totalVendors: number
  totalStyles: number
  totalImages: number
  completedVendors: number
}

/**
 * Fetch statistics for a specific event
 *
 * @param eventId - The ID of the event
 * @returns Promise resolving to event statistics
 */
export async function getEventStats(eventId: string): Promise<EventStats> {
  // Get total vendors for this event
  const { count: totalVendors } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  // Get total styles for this event
  const { count: totalStyles } = await supabase
    .from('fabric_styles')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)

  // Get vendor IDs for this event to count images
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id')
    .eq('event_id', eventId)

  const vendorIds = vendors?.map((v) => v.id) || []

  // Get total images for vendors in this event
  let totalImages = 0
  if (vendorIds.length > 0) {
    const { count } = await supabase
      .from('fabric_images')
      .select('*', { count: 'exact', head: true })
      .in('vendor_id', vendorIds)
    totalImages = count || 0
  }

  // Get completed vendors (vendors with at least one committed style)
  const { count: completedVendors } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .gte('styles_committed_at', new Date(0).toISOString()) // Has committed styles

  return {
    totalVendors: totalVendors || 0,
    totalStyles: totalStyles || 0,
    totalImages,
    completedVendors: completedVendors || 0,
  }
}
