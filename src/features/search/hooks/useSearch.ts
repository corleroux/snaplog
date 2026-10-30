/**
 * TanStack Query hooks for search functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  globalSearch,
  saveSearchHistory,
  getRecentSearches,
  clearSearchHistory,
} from '../api/search'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const searchKeys = {
  all: ['search'] as const,
  results: (query: string) => [...searchKeys.all, 'results', query] as const,
  recent: () => [...searchKeys.all, 'recent'] as const,
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Search across vendors, styles, and events.
 * Uses TanStack Query for caching and debouncing.
 */
export function useGlobalSearch(
  query: string,
  types: Array<'vendors' | 'styles' | 'events'> = ['vendors', 'styles', 'events'],
  eventId?: string,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options

  return useQuery({
    queryKey: searchKeys.results(query),
    queryFn: () => globalSearch(query, types, eventId),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime)
  })
}

/**
 * Get recent searches for the current user.
 */
export function useRecentSearches(
  limit = 10,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options
  return useQuery({
    queryKey: searchKeys.recent(),
    queryFn: () => getRecentSearches(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled,
  })
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Save a search to history.
 */
export function useSaveSearchHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ query, resultType }: { query: string; resultType?: string }) =>
      saveSearchHistory(query, resultType),
    onSuccess: () => {
      // Invalidate recent searches query
      queryClient.invalidateQueries({ queryKey: searchKeys.recent() })
    },
  })
}

/**
 * Clear a search history item or all history.
 */
export function useClearSearchHistory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (queryId?: string) => clearSearchHistory(queryId),
    onSuccess: () => {
      // Invalidate recent searches query
      queryClient.invalidateQueries({ queryKey: searchKeys.recent() })
    },
  })
}
