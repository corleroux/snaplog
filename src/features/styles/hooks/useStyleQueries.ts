/**
 * TanStack Query hooks for the Style domain
 *
 * These hooks are ADDITIVE to the existing context-based hooks.
 * They use the styleRepository singleton as the queryFn implementation,
 * providing cache management via TanStack Query.
 */

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { styleRepository } from '../api/styleRepository'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const styleKeys = {
  all: ['styles'] as const,
  byVendor: (vendorId: string) => [...styleKeys.all, vendorId] as const,
  byEvent: (eventId: string) => [...styleKeys.all, 'event', eventId] as const,
  detail: (id: string) => [...styleKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all styles for a given vendor with TanStack Query caching.
 *
 * staleTime: 2 min — style lists change infrequently during an event.
 */
export function useStylesQuery(vendorId: string) {
  return useQuery({
    queryKey: styleKeys.byVendor(vendorId),
    queryFn: () => styleRepository.getStylesByVendor(vendorId),
    enabled: !!vendorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch styles for a given vendor with cursor-based pagination.
 *
 * Returns pages of styles that can be progressively loaded via "Load More".
 * Each page fetches up to `limit` styles ordered by created_at descending.
 */
export function useStylesInfiniteQuery(vendorId: string) {
  return useInfiniteQuery({
    queryKey: [...styleKeys.byVendor(vendorId), 'paginated'],
    queryFn: ({ pageParam }) => styleRepository.getStylesByVendorPaginated(vendorId, {
      cursor: pageParam as string | undefined,
      limit: 20,
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!vendorId,
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Fetch all styles for a given event with TanStack Query caching.
 *
 * staleTime: 2 min — style lists change infrequently during an event.
 */
export function useStylesByEventQuery(eventId: string) {
  return useQuery({
    queryKey: styleKeys.byEvent(eventId),
    queryFn: () => styleRepository.getStylesByEvent(eventId),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Fetch a single style by ID with TanStack Query caching.
 *
 * staleTime: 5 min — individual style details rarely change within a session.
 */
export function useStyleQuery(id: string) {
  return useQuery({
    queryKey: styleKeys.detail(id),
    queryFn: () => styleRepository.getStyle(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ---------------------------------------------------------------------------
// Cache invalidation helpers
// ---------------------------------------------------------------------------

/**
 * Invalidate all style queries for a given vendor.
 *
 * Call after mutations (create, update, delete) to refetch stale data.
 */
export function useInvalidateStyles(vendorId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: styleKeys.byVendor(vendorId) })
    queryClient.invalidateQueries({ queryKey: styleKeys.all })
  }
}

/**
 * Invalidate a single style detail query.
 */
export function useInvalidateStyle(id: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: styleKeys.detail(id) })
    queryClient.invalidateQueries({ queryKey: styleKeys.all })
  }
}
