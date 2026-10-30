/**
 * Style Commit Flow Tests
 *
 * Tests the commitReviewedFabric function for:
 * - Valid commit handling (success path)
 * - Commit without source images
 * - Commit with source images array
 * - isFabricAlreadyCommitted positive case
 * - getCommittedStyleId positive case
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  commitReviewedFabric,
  isFabricAlreadyCommitted,
  getCommittedStyleId,
} from '../commitReviewedFabricDocument'
import type { CommitFabricResponse } from '@/features/styles/types/fabricCommit'
import type { ReviewedFabricDocument } from '@/features/styles/types/fabricCommit'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: {
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(() => ({ data: { session: null }, error: null })),
    },
  },
  invokeEdgeFunction: vi.fn(),
}))

import { supabase, invokeEdgeFunction } from '@/lib/supabase/client'
const mockInvokeEdgeFunction = vi.mocked(invokeEdgeFunction)
const mockFrom = vi.mocked(supabase.from)

describe('commitReviewedFabric', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validParams = {
    scanSessionId: '123e4567-e89b-12d3-a456-426614174000',
    eventId: '987fcdeb-51a2-43f1-a456-426614174000',
    vendorId: 'abc12345-e89b-12d3-a456-426614174000',
    reviewedDocument: {
      style: {
        item_code: 'FAB-001',
        name: 'Cotton Twill',
        composition: '100% Cotton',
        category: 'Woven',
        construction: 'Twill',
        finish: 'Brushed',
        width_cm: 150,
        weight_gsm: 250,
        season: 'SS25',
      },
      variants: [
        {
          color_code: 'NV001',
          color_name: 'Navy',
          variant_name: 'Navy Base',
        },
      ],
      inventory: [],
      prices: [
        {
          variant_index: 0,
          price: {
            currency: 'USD',
            price: 12.5,
            price_unit: 'yard',
          },
        },
      ],
    } as ReviewedFabricDocument,
    sourceImagePaths: ['fabric-documents/test.jpg'],
    sourceImageUrls: ['https://storage.example.com/test.jpg'],
  }

  const mockSuccessResponse: CommitFabricResponse = {
    style_id: '456e7890-e89b-12d3-a456-426614174000',
    variant_ids: ['var-001-e89b-12d3-a456-426614174000'],
    inventory_ids: [],
    price_ids: ['ph-001-e89b-12d3-a456-426614174000'],
    fabric_image_ids: ['img-001-e89b-12d3-a456-426614174000'],
    scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
  }

  describe('Valid commit handling', () => {
    it('should return style_id and related IDs for valid commit', async () => {
      mockInvokeEdgeFunction.mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      })

      const result = await commitReviewedFabric(validParams)

      expect(result).toEqual(mockSuccessResponse)
      expect(result.style_id).toBe('456e7890-e89b-12d3-a456-426614174000')
      expect(result.variant_ids).toHaveLength(1)
      expect(result.price_ids).toHaveLength(1)
      expect(mockInvokeEdgeFunction).toHaveBeenCalledWith(
        'commit-reviewed-fabric-document',
        {
          body: expect.objectContaining({
            scan_session_id: validParams.scanSessionId,
            event_id: validParams.eventId,
            vendor_id: validParams.vendorId,
            reviewed_document: validParams.reviewedDocument,
          }),
        }
      )
    })

    it('should pass source_images array in payload', async () => {
      mockInvokeEdgeFunction.mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      })

      await commitReviewedFabric(validParams)

      expect(mockInvokeEdgeFunction).toHaveBeenCalledWith(
        'commit-reviewed-fabric-document',
        {
          body: expect.objectContaining({
            source_images: [
              {
                storage_path: 'fabric-documents/test.jpg',
                public_url: 'https://storage.example.com/test.jpg',
              },
            ],
          }),
        }
      )
    })

    it('should handle commit without source images', async () => {
      const paramsWithoutImages = {
        ...validParams,
        sourceImagePaths: null,
        sourceImageUrls: null,
      }

      mockInvokeEdgeFunction.mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      })

      const result = await commitReviewedFabric(paramsWithoutImages)

      expect(result).toEqual(mockSuccessResponse)
      expect(mockInvokeEdgeFunction).toHaveBeenCalledWith(
        'commit-reviewed-fabric-document',
        {
          body: expect.objectContaining({
            source_images: null,
          }),
        }
      )
    })

    it('should handle source images with missing URLs', async () => {
      const paramsWithMissingUrl = {
        ...validParams,
        sourceImagePaths: ['fabric-documents/test.jpg', 'fabric-documents/test2.jpg'],
        sourceImageUrls: ['https://storage.example.com/test.jpg', null],
      }

      mockInvokeEdgeFunction.mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      })

      await commitReviewedFabric(paramsWithMissingUrl)

      expect(mockInvokeEdgeFunction).toHaveBeenCalledWith(
        'commit-reviewed-fabric-document',
        {
          body: expect.objectContaining({
            source_images: [
              { storage_path: 'fabric-documents/test.jpg', public_url: 'https://storage.example.com/test.jpg' },
              { storage_path: 'fabric-documents/test2.jpg', public_url: null },
            ],
          }),
        }
      )
    })
  })
})

describe('isFabricAlreadyCommitted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when style_id exists', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { style_id: '456e7890-e89b-12d3-a456-426614174000' },
      error: null,
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await isFabricAlreadyCommitted('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('scan_sessions')
    expect(mockSelect).toHaveBeenCalledWith('style_id')
    expect(mockEq).toHaveBeenCalledWith('id', '123e4567-e89b-12d3-a456-426614174000')
  })

  it('should return false when style_id is null', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { style_id: null },
      error: null,
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await isFabricAlreadyCommitted('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toBe(false)
  })

  it('should return false on error', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Scan session not found' },
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await isFabricAlreadyCommitted('nonexistent-id')

    expect(result).toBe(false)
  })
})

describe('getCommittedStyleId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return style_id when exists', async () => {
    const styleId = '456e7890-e89b-12d3-a456-426614174000'
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { style_id: styleId },
      error: null,
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await getCommittedStyleId('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toBe(styleId)
  })

  it('should return null when style_id is null', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { style_id: null },
      error: null,
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await getCommittedStyleId('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toBeNull()
  })

  it('should return null on error', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await getCommittedStyleId('nonexistent-id')

    expect(result).toBeNull()
  })
})
