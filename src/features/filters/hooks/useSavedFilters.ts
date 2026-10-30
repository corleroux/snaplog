/**
 * TanStack Query hooks for saved filters
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  saveFilter,
  getSavedFilters,
  getFilterById,
  updateFilter,
  deleteFilter,
  reorderFilters,
} from '../api/savedFilters'
import type { SaveFilterInput, UpdateFilterInput, FilterEntityType } from '../types'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const savedFiltersKeys = {
  all: ['saved-filters'] as const,
  lists: () => [...savedFiltersKeys.all, 'list'] as const,
  type: (entityType: FilterEntityType) =>
    [...savedFiltersKeys.all, 'type', entityType] as const,
  detail: (id: string) => [...savedFiltersKeys.all, 'detail', id] as const,
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Get saved filters for an entity type.
 */
export function useSavedFilters(
  entityType: FilterEntityType,
  includeShared = true
) {
  return useQuery({
    queryKey: savedFiltersKeys.type(entityType),
    queryFn: () => getSavedFilters(entityType, includeShared),
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Get a single filter by ID.
 */
export function useSavedFilter(id: string) {
  return useQuery({
    queryKey: savedFiltersKeys.detail(id),
    queryFn: () => getFilterById(id),
    enabled: !!id,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Save a new filter.
 */
export function useSaveFilter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filter: SaveFilterInput) => saveFilter(filter),
    onSuccess: (_, variables) => {
      // Invalidate the filters list for this entity type
      queryClient.invalidateQueries({
        queryKey: savedFiltersKeys.type(variables.entity_type),
      })
    },
  })
}

/**
 * Update an existing filter.
 */
export function useUpdateFilter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateFilterInput }) =>
      updateFilter(id, updates),
    onSuccess: (_, variables) => {
      // Invalidate the specific filter and the list
      queryClient.invalidateQueries({ queryKey: savedFiltersKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: savedFiltersKeys.lists() })
    },
  })
}

/**
 * Delete a filter.
 */
export function useDeleteFilter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filterId: string) => deleteFilter(filterId),
    onSuccess: () => {
      // Invalidate all filter lists
      queryClient.invalidateQueries({ queryKey: savedFiltersKeys.lists() })
    },
  })
}

/**
 * Reorder filters.
 */
export function useReorderFilters() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (filterIds: string[]) => reorderFilters(filterIds),
    onSuccess: () => {
      // Invalidate all filter lists
      queryClient.invalidateQueries({ queryKey: savedFiltersKeys.lists() })
    },
  })
}
