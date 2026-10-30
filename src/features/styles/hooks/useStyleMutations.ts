/**
 * TanStack Query mutation hooks for the Style domain
 *
 * These hooks wrap style repository mutations with TanStack Query's useMutation,
 * providing automatic cache invalidation and optimistic updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { styleRepository } from '../api/styleRepository'
import { styleKeys, useInvalidateStyles, useInvalidateStyle } from './useStyleQueries'
import type { StyleCreateInput, StyleUpdateInput } from '../api/styleRepositoryContext'
import { toggleShortlist } from '../api/toggleShortlist'

/**
 * Create a new style
 *
 * Invalidates style list queries on success.
 */
export function useCreateStyle(vendorId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateStyles(vendorId)

  return useMutation({
    mutationFn: (input: StyleCreateInput) => styleRepository.createStyle(input),
    onSuccess: (style) => {
      // Invalidate and refetch style list
      invalidate()
      // Add new style to cache immediately
      queryClient.setQueryData(
        styleKeys.detail((style as any).id),
        style
      )
    },
  })
}

/**
 * Update an existing style
 *
 * Invalidates both the specific style and the list query on success.
 */
export function useUpdateStyle(vendorId: string, styleId: string) {
  const queryClient = useQueryClient()
  const invalidateList = useInvalidateStyles(vendorId)
  const invalidateDetail = useInvalidateStyle(styleId)

  return useMutation({
    mutationFn: (updates: StyleUpdateInput) => styleRepository.updateStyle(styleId, updates),
    onSuccess: (updatedStyle) => {
      // Update cache with new data
      queryClient.setQueryData(
        styleKeys.detail(styleId),
        updatedStyle
      )
      // Invalidate queries
      invalidateList()
      invalidateDetail()
    },
  })
}

/**
 * Delete a style
 *
 * Invalidates style list queries on success.
 */
export function useDeleteStyle(vendorId: string) {
  const invalidate = useInvalidateStyles(vendorId)

  return useMutation({
    mutationFn: (styleId: string) => styleRepository.deleteStyle(styleId),
    onSuccess: () => {
      invalidate()
    },
  })
}

/**
 * Batch update styles
 *
 * Invalidates style list queries on success.
 */
export function useBatchUpdateStyles(vendorId: string) {
  const invalidate = useInvalidateStyles(vendorId)

  return useMutation({
    mutationFn: ({ styleIds, updates }: { styleIds: string[]; updates: Partial<StyleCreateInput> }) =>
      Promise.all(
        styleIds.map(id =>
          styleRepository.updateStyle(id, updates as StyleUpdateInput)
        )
      ),
    onSuccess: () => {
      invalidate()
    },
  })
}

/**
 * Toggle shortlist status for a style
 *
 * Invalidates both the style list and detail queries on success.
 */
export function useToggleShortlist(_vendorId: string) {
  const queryClient = useQueryClient()
  const invalidateList = useInvalidateStyles(_vendorId)

  return useMutation({
    mutationFn: ({ styleId, value }: { styleId: string; value: boolean }) =>
      toggleShortlist(styleId, value),
    onSuccess: (_data, variables) => {
      invalidateList()
      queryClient.invalidateQueries({ queryKey: styleKeys.detail(variables.styleId) })
    },
  })
}
