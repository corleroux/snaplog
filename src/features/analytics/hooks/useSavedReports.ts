/**
 * TanStack Query hooks for saved reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  saveReport,
  getSavedReports,
  getReportById,
  deleteReport,
  updateReport,
} from '../api/savedReports'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const savedReportsKeys = {
  all: ['saved-reports'] as const,
  lists: () => [...savedReportsKeys.all, 'list'] as const,
  detail: (id: string) => [...savedReportsKeys.all, 'detail', id] as const,
  event: (eventId: string) => [...savedReportsKeys.all, 'event', eventId] as const,
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all saved reports with TanStack Query caching.
 */
export function useSavedReports(eventId?: string) {
  return useQuery({
    queryKey: eventId ? savedReportsKeys.event(eventId) : savedReportsKeys.lists(),
    queryFn: () => getSavedReports(eventId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Fetch a single report by ID with TanStack Query caching.
 */
export function useSavedReport(id: string) {
  return useQuery({
    queryKey: savedReportsKeys.detail(id),
    queryFn: () => getReportById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Save a new report configuration.
 */
export function useSaveReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveReport,
    onSuccess: () => {
      // Invalidate the reports list
      queryClient.invalidateQueries({ queryKey: savedReportsKeys.lists() })
    },
  })
}

/**
 * Update an existing report.
 */
export function useUpdateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Parameters<typeof updateReport>[1] }) =>
      updateReport(id, updates),
    onSuccess: (_, variables) => {
      // Invalidate the specific report and the list
      queryClient.invalidateQueries({ queryKey: savedReportsKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: savedReportsKeys.lists() })
    },
  })
}

/**
 * Delete a report.
 */
export function useDeleteReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      // Invalidate the reports list
      queryClient.invalidateQueries({ queryKey: savedReportsKeys.lists() })
    },
  })
}
