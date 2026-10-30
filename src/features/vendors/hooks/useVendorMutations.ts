/**
 * TanStack Query mutation hooks for the Vendor domain
 *
 * These hooks wrap vendor repository mutations with TanStack Query's useMutation,
 * providing automatic cache invalidation and optimistic updates.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { vendorRepository } from '../api/vendorRepository'
import { vendorKeys, useInvalidateVendors, useInvalidateVendor } from './useVendorQueries'
import type { VendorCreateInput, VendorUpdateInput } from '../api/vendorRepositoryContext'

/**
 * Create a new vendor
 *
 * Invalidates vendor list queries on success.
 */
export function useCreateVendor(eventId: string) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateVendors(eventId)

  return useMutation({
    mutationFn: (input: VendorCreateInput) => vendorRepository.createFromReviewedCapture(input),
    onSuccess: (vendor) => {
      // Invalidate and refetch vendor list
      invalidate()
      // Add new vendor to cache immediately
      queryClient.setQueryData(
        vendorKeys.detail((vendor as any).id),
        vendor
      )
    },
  })
}

/**
 * Update an existing vendor
 *
 * Invalidates both the specific vendor and the list query on success.
 */
export function useUpdateVendor(eventId: string, vendorId: string) {
  const queryClient = useQueryClient()
  const invalidateList = useInvalidateVendors(eventId)
  const invalidateDetail = useInvalidateVendor(vendorId)

  return useMutation({
    mutationFn: ({ input, version }: { input: VendorUpdateInput; version: number }) =>
      vendorRepository.update(vendorId, input, version),
    onSuccess: (updatedVendor) => {
      // Update cache with new data
      queryClient.setQueryData(
        vendorKeys.detail(vendorId),
        updatedVendor
      )
      // Invalidate queries
      invalidateList()
      invalidateDetail()
    },
  })
}

/**
 * Archive (soft-delete) a vendor
 *
 * Invalidates vendor list queries on success.
 */
export function useArchiveVendor(eventId: string) {
  const invalidate = useInvalidateVendors(eventId)

  return useMutation({
    mutationFn: (vendorId: string) => vendorRepository.archive(vendorId),
    onSuccess: () => {
      // Remove from cache
      invalidate()
    },
  })
}

/**
 * Reorder vendors via drag-and-drop
 *
 * Invalidates vendor list queries on success.
 */
export function useReorderVendors(eventId: string) {
  const invalidate = useInvalidateVendors(eventId)

  return useMutation({
    mutationFn: ({ orderedIds }: { orderedIds: string[] }) => vendorRepository.reorderVendors(orderedIds),
    onSuccess: () => {
      invalidate()
    },
  })
}

/**
 * Batch update vendors
 *
 * Invalidates vendor list queries on success.
 */
export function useBatchUpdateVendors(eventId: string) {
  const invalidate = useInvalidateVendors(eventId)

  return useMutation({
    mutationFn: ({ vendorIds, updates }: { vendorIds: string[]; updates: Partial<VendorCreateInput> }) =>
      Promise.all(
        vendorIds.map(id =>
          vendorRepository.update(id, updates as VendorUpdateInput, 0)
        )
      ),
    onSuccess: () => {
      invalidate()
    },
  })
}
