/**
 * TanStack Query hook for vendor comparison statistics
 */

import { useQuery } from '@tanstack/react-query'
import { getVendorComparisonStats } from '../api/getVendorComparisonStats'

export const vendorComparisonKeys = {
  all: ['vendor-comparison-stats'] as const,
  event: (eventId: string) => [...vendorComparisonKeys.all, eventId] as const,
}

/**
 * Fetch per-vendor statistics for all vendors in an event.
 *
 * staleTime: 60 sec — comparison stats change as captures progress.
 */
export function useVendorComparisonStats(eventId: string) {
  return useQuery({
    queryKey: vendorComparisonKeys.event(eventId),
    queryFn: () => getVendorComparisonStats(eventId),
    enabled: !!eventId,
    staleTime: 60 * 1000,
  })
}
