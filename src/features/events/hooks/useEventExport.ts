/**
 * React Hook for Event Export
 *
 * Provides functions to export an entire event to Excel/CSV or PDF catalogue.
 */

import { useState, useCallback } from 'react'
import { exportEventToExcel } from '@/features/events/api/exportEventCatalogue'
import { usePdfExport } from '@/features/events/hooks/usePdfExport'

export interface UseEventExportResult {
  isExportingExcel: boolean
  isExportingPdf: boolean
  error: string | null
  exportToExcel: (eventId: string, eventName: string) => Promise<void>
  exportToPdf: (eventId: string) => Promise<void>
  clearError: () => void
}

/**
 * Hook for event export functionality (Excel/CSV and PDF)
 */
export function useEventExport(): UseEventExportResult {
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isGenerating: isExportingPdf, generateCatalogue } = usePdfExport()

  const exportToExcel = useCallback(async (eventId: string, eventName: string) => {
    setIsExportingExcel(true)
    setError(null)

    try {
      await exportEventToExcel(eventId, eventName)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export event'
      setError(message)
      throw err
    } finally {
      setIsExportingExcel(false)
    }
  }, [])

  const exportToPdf = useCallback(async (eventId: string) => {
    setError(null)
    try {
      await generateCatalogue(eventId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PDF'
      setError(message)
      throw err
    }
  }, [generateCatalogue])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isExportingExcel,
    isExportingPdf,
    error,
    exportToExcel,
    exportToPdf,
    clearError,
  }
}
