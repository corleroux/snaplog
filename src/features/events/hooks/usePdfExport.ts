/**
 * React Hook for PDF Export
 *
 * Provides functions to generate and download catalogues as PDFs.
 */

import { useState, useCallback } from 'react'
import { exportEventCatalogue, getCataloguePreview } from '@/features/events/api/exportEventCatalogue'
import type { CatalogueOptions } from '@/lib/pdf/catalogueGenerator'

export interface CataloguePreview {
  vendorCount: number
  styleCount: number
  imageCount: number
  vendors: Array<{ id: string; name: string; styleCount: number }>
}

export interface UsePdfExportResult {
  isGenerating: boolean
  isLoadingPreview: boolean
  preview: CataloguePreview | null
  error: string | null
  generateCatalogue: (eventId: string, options?: CatalogueOptions) => Promise<void>
  loadPreview: (eventId: string) => Promise<void>
  clearError: () => void
}

/**
 * Hook for PDF export functionality
 */
export function usePdfExport(): UsePdfExportResult {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<CataloguePreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateCatalogue = useCallback(async (eventId: string, options?: CatalogueOptions) => {
    setIsGenerating(true)
    setError(null)

    try {
      await exportEventCatalogue(eventId, options)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate catalogue'
      setError(message)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const loadPreview = useCallback(async (eventId: string) => {
    setIsLoadingPreview(true)
    setError(null)

    try {
      const data = await getCataloguePreview(eventId)
      setPreview(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preview'
      setError(message)
      throw err
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isGenerating,
    isLoadingPreview,
    preview,
    error,
    generateCatalogue,
    loadPreview,
    clearError,
  }
}
