/**
 * Event Deletion Impact Analysis
 *
 * Counts related records that will be affected by event deletion.
 * Used by the confirmation dialog to show users what they'll lose.
 */

import { supabase } from '@/lib/supabase/client'

export interface EventDeletionImpact {
  vendorCount: number
  styleCount: number
  variantCount: number
  imageCount: number
}

/**
 * Count records that will be cascade-deleted when an event is deleted.
 *
 * Queries: vendors, fabric_styles, fabric_variants, fabric_images
 * all filtered by event_id.
 */
export async function getEventDeletionImpact(eventId: string): Promise<EventDeletionImpact> {
  const [vendors, styles, variants, images] = await Promise.all([
    supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('fabric_styles').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('fabric_variants').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
    supabase.from('fabric_images').select('id', { count: 'exact', head: true }).eq('event_id', eventId),
  ])

  return {
    vendorCount: vendors.count ?? 0,
    styleCount: styles.count ?? 0,
    variantCount: variants.count ?? 0,
    imageCount: images.count ?? 0,
  }
}
