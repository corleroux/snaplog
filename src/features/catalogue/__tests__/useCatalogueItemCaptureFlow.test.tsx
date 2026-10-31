/**
 * Catalogue item capture flow hook tests (FR-EXT-06 no-overwrite rule).
 *
 * Proves reviewer edits survive a re-extraction: the second extraction's
 * values do not clobber corrections made against the first.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const GARMENT_DEF = {
  slug: 'garment',
  kind: 'catalogue_type',
  display_name: 'Garment',
  version: 1,
  schema: {
    output_root: 'item',
    scan_types: { garment_flat: 'flat lay' },
    fields: [
      { path: 'item.garment_type', type: 'string', label: 'Garment type', required: false },
      { path: 'item.fit', type: 'string', label: 'Fit', required: true },
    ],
  },
}

const SESSION = {
  session: {
    images: [
      { id: 'img-1', uri: 'https://example.com/garment.jpg', storagePath: 'g/test.jpg', mimeType: 'image/jpeg', classification: 'info' },
    ],
  },
  validate: () => ({ valid: true, errors: [] }),
  getInfoImage: () => SESSION.session.images[0],
  startSession: vi.fn(),
  addCaptureImage: vi.fn(),
  removeCaptureImage: vi.fn(),
  setImageClassification: vi.fn(),
}

const extractMock = vi.fn()
const commitMock = vi.fn()

vi.mock('@/hooks/useCaptureSession', () => ({
  useCaptureSession: () => SESSION,
}))

vi.mock('@/lib/upload/imageUpload', () => ({
  uploadCaptureImage: vi.fn(),
}))

vi.mock('@/lib/scanSession/scanSessionService', () => ({
  createScanSession: vi.fn(async () => 'scan-1'),
}))

vi.mock('../api/extractCatalogueItem', () => ({
  extractCatalogueItem: (...args: unknown[]) => extractMock(...args),
}))

vi.mock('../api/commitCatalogueItem', () => ({
  commitCatalogueItem: (...args: unknown[]) => commitMock(...args),
}))

vi.mock('../api/catalogueRegistry', async (importOriginal) => {
  const mod = (await importOriginal()) as Record<string, unknown>
  return { ...mod, getCatalogueType: vi.fn(async () => GARMENT_DEF) }
})

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}))

import { useCatalogueItemCaptureFlow } from '../hooks/useCatalogueItemCaptureFlow'

describe('useCatalogueItemCaptureFlow (no-overwrite rule)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    extractMock.mockResolvedValue({
      item: { item_code: 'G1', garment_type: 'Skirt', fit: 'Relaxed' },
      metadata: { extractor_name: 'x', extractor_model: 'y', extractor_version: '1.0.0' },
    })
  })

  it('carries reviewer edits forward across a re-extraction', async () => {
    const { result } = renderHook(() =>
      useCatalogueItemCaptureFlow({ eventId: 'e1', vendorId: 'v1' })
    )

    await act(async () => {
      await result.current.selectCatalogueType('garment')
    })

    await act(async () => {
      await result.current.proceedToProcessing()
    })

    await waitFor(() => {
      expect(result.current.state.screen).toBe('review')
    })

    // Reviewer corrects two fields.
    act(() => {
      result.current.handleFieldChange('item.garment_type', 'Dress')
      result.current.handleFieldChange('item.fit', 'Slim')
    })

    // Re-extraction returns different values for the same fields.
    extractMock.mockResolvedValueOnce({
      item: { item_code: 'G1', garment_type: 'Skirt', fit: 'Relaxed' },
      metadata: { extractor_name: 'x', extractor_model: 'y', extractor_version: '1.0.0' },
    })

    await act(async () => {
      await result.current.proceedToProcessing()
    })

    await waitFor(() => {
      expect(result.current.state.screen).toBe('review')
    })

    // Corrections win over the second extraction.
    expect(result.current.reviewedValues).toEqual({
      item: { item_code: 'G1', garment_type: 'Dress', fit: 'Slim' },
    })
  })
})
