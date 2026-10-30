/**
 * Vendor Attendance API
 *
 * Functions for fetching vendor attendance/capture status for events.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Vendor attendance status
 */
export interface VendorAttendanceItem {
  id: string
  name: string
  category: string | null
  booth_number: string | null
  styles_count: number
}

/**
 * Vendor attendance result
 */
export interface VendorAttendance {
  captured: VendorAttendanceItem[]
  not_captured: VendorAttendanceItem[]
  total: number
  captured_count: number
}

/**
 * Options for filtering vendor attendance
 */
export interface VendorAttendanceOptions {
  category?: string
}

/**
 * Fetch vendor attendance for a specific event
 *
 * @param eventId - The ID of the event
 * @param options - Optional filters
 * @returns Promise resolving to vendor attendance
 */
export async function getVendorAttendance(
  eventId: string,
  options: VendorAttendanceOptions = {}
): Promise<VendorAttendance> {
  let query = supabase
    .from('vendors')
    .select('*, fabric_styles(id)')
    .eq('event_id', eventId)

  // Apply category filter if provided
  if (options.category) {
    query = query.eq('category', options.category) as any
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch vendor attendance: ${error.message}`)
  }

  const vendors = data || []

  // Separate into captured and not captured
  const captured: VendorAttendanceItem[] = []
  const not_captured: VendorAttendanceItem[] = []

  for (const vendor of vendors) {
    const item: VendorAttendanceItem = {
      id: vendor.id,
      name: vendor.name,
      category: vendor.category,
      booth_number: vendor.booth_number,
      styles_count: vendor.fabric_styles?.length || 0,
    }

    // Consider captured if styles_committed_at is set (has committed styles)
    if (vendor.styles_committed_at) {
      captured.push(item)
    } else {
      not_captured.push(item)
    }
  }

  return {
    captured,
    not_captured,
    total: vendors.length,
    captured_count: captured.length,
  }
}
