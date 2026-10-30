/**
 * TanStack Query hooks for batch operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  batchArchiveVendors,
  batchUpdateVendorCategory,
  batchTagVendors,
  batchExportVendors,
} from '@/features/vendors'
import {
  batchArchiveStyles,
  batchUpdateStyleSeason,
  batchUpdateStyleStatus,
  batchExportStyles,
} from '@/features/styles'

// ---------------------------------------------------------------------------
// Vendor batch operations
// ---------------------------------------------------------------------------

/**
 * Batch archive vendors.
 */
export function useBatchArchiveVendors() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchArchiveVendors,
    onSuccess: () => {
      // Invalidate vendor queries
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

/**
 * Batch update vendor category.
 */
export function useBatchUpdateVendorCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchUpdateVendorCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

/**
 * Batch tag vendors.
 */
export function useBatchTagVendors() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchTagVendors,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
}

/**
 * Batch export vendors.
 */
export function useBatchExportVendors() {
  return useMutation({
    mutationFn: batchExportVendors,
  })
}

// ---------------------------------------------------------------------------
// Style batch operations
// ---------------------------------------------------------------------------

/**
 * Batch archive styles.
 */
export function useBatchArchiveStyles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchArchiveStyles,
    onSuccess: () => {
      // Invalidate style queries
      queryClient.invalidateQueries({ queryKey: ['styles'] })
      queryClient.invalidateQueries({ queryKey: ['fabric-styles'] })
    },
  })
}

/**
 * Batch update style season.
 */
export function useBatchUpdateStyleSeason() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchUpdateStyleSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['styles'] })
      queryClient.invalidateQueries({ queryKey: ['fabric-styles'] })
    },
  })
}

/**
 * Batch update style status.
 */
export function useBatchUpdateStyleStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: batchUpdateStyleStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['styles'] })
      queryClient.invalidateQueries({ queryKey: ['fabric-styles'] })
    },
  })
}

/**
 * Batch export styles.
 */
export function useBatchExportStyles() {
  return useMutation({
    mutationFn: batchExportStyles,
  })
}
