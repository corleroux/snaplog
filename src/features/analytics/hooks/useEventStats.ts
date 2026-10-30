/**
 * TanStack Query hook for event statistics
 */

import { useQuery } from '@tanstack/react-query'
import { getEventStats } from '../api/getEventStats'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const eventStatsKeys = {
  all: ['event-stats'] as const,
  detail: (eventId: string) => [...eventStatsKeys.all, eventId] as const,
}

// ---------------------------------------------------------------------------
// Query hook
// ---------------------------------------------------------------------------

/**
 * Fetch statistics for a specific event with TanStack Query caching.
 *
 * staleTime: 30 sec — stats change frequently during active capture sessions.
 */
export function useEventStats(eventId: string) {
  return useQuery({
    queryKey: eventStatsKeys.detail(eventId),
    queryFn: () => getEventStats(eventId),
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
  })
}
