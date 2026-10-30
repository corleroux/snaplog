/**
 * Capture Progress API
 *
 * Functions for fetching capture progress metrics for events.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Per-user capture stats
 */
export interface UserCaptureStats {
  user_id: string
  user_email: string | null
  captured_count: number
}

/**
 * Capture progress metrics
 */
export interface CaptureProgress {
  total_vendors: number
  captured_vendors: number
  completion_percentage: number
  remaining_vendors: number
  captures_per_user: UserCaptureStats[]
  estimated_remaining_minutes: number | null
}

/**
 * Fetch capture progress for a specific event
 *
 * @param eventId - The ID of the event
 * @returns Promise resolving to capture progress
 */
export async function getCaptureProgress(
  eventId: string
): Promise<CaptureProgress> {
  // Get vendors with capture info
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, name, styles_committed_at')
    .eq('event_id', eventId)

  if (error) {
    throw new Error(`Failed to fetch capture progress: ${error.message}`)
  }

  const total_vendors = vendors?.length || 0
  const captured_vendors =
    vendors?.filter((v) => v.styles_committed_at).length || 0

  const completion_percentage =
    total_vendors > 0
      ? Math.round((captured_vendors / total_vendors) * 100)
      : 0

  // Note: Captures per user requires tracking which user captured each vendor
  // This would need a captured_by_user_id field on vendors table
  // For now, returning empty array
  const captures_per_user: UserCaptureStats[] = []

  // Estimate remaining time based on average capture rate
  // Assume 15 minutes per vendor as a baseline estimate
  const estimated_remaining_minutes =
    total_vendors - captured_vendors > 0
      ? (total_vendors - captured_vendors) * 15
      : null

  return {
    total_vendors,
    captured_vendors,
    completion_percentage,
    remaining_vendors: total_vendors - captured_vendors,
    captures_per_user,
    estimated_remaining_minutes,
  }
}
