/**
 * TanStack Query hooks for the Vendor domain
 *
 * These hooks are ADDITIVE to the existing context-based hooks.
 * They use the vendorRepository singleton as the queryFn implementation,
 * providing cache management via TanStack Query.
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { vendorRepository } from '../api/vendorRepository'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const vendorKeys = {
  all: ['vendors'] as const,
  byEvent: (eventId: string) => [...vendorKeys.all, eventId] as const,
  detail: (id: string) => [...vendorKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all vendors for a given event with TanStack Query caching.
 *
 * staleTime: 2 min — vendor lists change infrequently during an event.
 */
export function useVendorsQuery(eventId: string) {
  return useQuery({
    queryKey: vendorKeys.byEvent(eventId),
    queryFn: () => vendorRepository.getByEvent(eventId),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch vendors for a given event with cursor-based pagination.
 *
 * Returns pages of vendors that can be progressively loaded via "Load More".
 * Each page fetches up to `limit` vendors ordered by created_at descending.
 */
export function useVendorsInfiniteQuery(eventId: string) {
  return useInfiniteQuery({
    queryKey: [...vendorKeys.byEvent(eventId), 'paginated'],
    queryFn: ({ pageParam }) => vendorRepository.getByEventPaginated(eventId, {
      cursor: pageParam as string | undefined,
      limit: 20,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Fetch a single vendor by ID with TanStack Query caching.
 *
 * staleTime: 5 min — individual vendor details rarely change within a session.
 */
export function useVendorQuery(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn: () => vendorRepository.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ---------------------------------------------------------------------------
// Cache invalidation helpers
// ---------------------------------------------------------------------------

/**
 * Invalidate all vendor queries for a given event.
 *
 * Call after mutations (create, update, delete) to refetch stale data.
 */
export function useInvalidateVendors(eventId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: vendorKeys.byEvent(eventId) })
    queryClient.invalidateQueries({ queryKey: vendorKeys.all })
  }
}

/**
 * Invalidate a single vendor detail query.
 */
export function useInvalidateVendor(id: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: vendorKeys.detail(id) })
    queryClient.invalidateQueries({ queryKey: vendorKeys.all })
  }
}
