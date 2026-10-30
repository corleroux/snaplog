/**
 * TanStack Query hook for team productivity metrics
 */

import { useQuery } from '@tanstack/react-query'
import { getTeamProductivity } from '../api/teamProductivity'
import type { ProductivityTimeRange } from '../api/teamProductivity'

export const teamProductivityKeys = {
  all: ['team-productivity'] as const,
  event: (eventId: string, timeRange: ProductivityTimeRange) =>
    [...teamProductivityKeys.all, eventId, timeRange] as const,
}

/**
 * Fetch team productivity metrics for an event.
 *
 * staleTime: 60 sec — productivity data changes infrequently mid-session.
 */
export function useTeamProductivity(
  eventId: string,
  timeRange: ProductivityTimeRange = 'week'
) {
  return useQuery({
    queryKey: teamProductivityKeys.event(eventId, timeRange),
    queryFn: () => getTeamProductivity(eventId, timeRange),
    enabled: !!eventId,
    staleTime: 60 * 1000,
  })
}
