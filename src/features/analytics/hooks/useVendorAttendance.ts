/**
 * TanStack Query hook for vendor attendance
 */

import { useQuery } from '@tanstack/react-query'
import { getVendorAttendance, VendorAttendanceOptions } from '../api/getVendorAttendance'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const vendorAttendanceKeys = {
  all: ['vendor-attendance'] as const,
  detail: (eventId: string, options?: VendorAttendanceOptions) =>
    [...vendorAttendanceKeys.all, eventId, options] as const,
}

// ---------------------------------------------------------------------------
// Query hook
// ---------------------------------------------------------------------------

/**
 * Fetch vendor attendance for a specific event with TanStack Query caching.
 *
 * staleTime: 60 sec — attendance changes moderately during capture.
 */
export function useVendorAttendance(
  eventId: string,
  options?: VendorAttendanceOptions
) {
  return useQuery({
    queryKey: vendorAttendanceKeys.detail(eventId, options),
    queryFn: () => getVendorAttendance(eventId, options),
    enabled: !!eventId,
    staleTime: 60 * 1000, // 60 seconds
  })
}
