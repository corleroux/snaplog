/**
 * TanStack Query hooks for the Event domain
 *
 * These hooks are ADDITIVE to the existing context-based hooks.
 * They use the getEvents function and eventRepository singleton
 * as the queryFn implementations, providing cache management via TanStack Query.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getEvents } from '../api/getEvents'
import { eventRepository } from '../api/eventRepository'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all events for the authenticated user with TanStack Query caching.
 *
 * staleTime: 2 min — event lists change infrequently.
 */
export function useEventsQuery() {
  return useQuery({
    queryKey: eventKeys.lists(),
    queryFn: () => getEvents(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch a single event by ID with TanStack Query caching.
 *
 * staleTime: 5 min — individual event details rarely change within a session.
 */
export function useEventQuery(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventRepository.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ---------------------------------------------------------------------------
// Cache invalidation helpers
// ---------------------------------------------------------------------------

/**
 * Invalidate the event list query.
 *
 * Call after create / delete mutations to refetch the list.
 */
export function useInvalidateEvents() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
  }
}

/**
 * Invalidate a single event detail query.
 *
 * Call after update mutations to refetch the detail.
 */
export function useInvalidateEvent(id: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() })
  }
}
