/**
 * Commit Reviewed Vendor API Tests
 *
 * Tests the commitReviewedVendor function for:
 * - Valid commit handling
 * - Empty company_name validation
 * - Invalid UUID validation
 * - Already committed idempotency
 * - Network error handling
 * - Idempotency check functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  commitReviewedVendor,
  isVendorAlreadyCommitted,
  getCommittedVendorId,
} from './commitReviewedVendor'
import type { CommitVendorResponse, CommitError } from '@/features/vendors/types/vendorCommit'
import type { ReviewedVendorDocument } from '@/features/vendors/types/vendorCommit'

// Mock supabase client - mock everything needed
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
  refreshSession: vi.fn(),
}))

// Get the mocked modules
import { supabase, invokeEdgeFunction } from '@/lib/supabase/client'
const mockFunctionsInvoke = vi.mocked(invokeEdgeFunction)
const mockFrom = vi.mocked(supabase.from)

describe('commitReviewedVendor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validParams = {
    scanSessionId: '123e4567-e89b-12d3-a456-426614174000',
    eventId: '987fcdeb-51a2-43f1-a456-426614174000',
    reviewedDocument: {
      company_name: 'Test Textile Co.',
      booth_number: 'A-42',
      contact_person: 'John Doe',
      email: 'john@test.com',
      phone: '+1 234 567 8900',
      whatsapp: '+1 234 567 8900',
      website_url: 'https://test.com',
      address: '123 Test St',
      country_of_origin: 'USA',
      brand_names: ['Brand1', 'Brand2'],
      notes: 'Test notes',
    } as ReviewedVendorDocument,
    sourceImagePath: 'vendor-documents/test.jpg',
    sourceImageUrl: 'https://storage.example.com/test.jpg',
  }

  const mockSuccessResponse: CommitVendorResponse = {
    vendor_id: '456e7890-e89b-12d3-a456-426614174000',
    vendor_image_id: '789f0123-e89b-12d3-a456-426614174000',
    scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
  }

  describe('Valid commit handling', () => {
    it('should return vendor_id for valid commit', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      })

      const result = await commitReviewedVendor(validParams)

      expect(result).toEqual(mockSuccessResponse)
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'commit-reviewed-vendor-document',
        {
          body: {
            scan_session_id: validParams.scanSessionId,
            event_id: validParams.eventId,
            reviewed_document: validParams.reviewedDocument,
            source_image: {
              storage_path: validParams.sourceImagePath,
              public_url: validParams.sourceImageUrl,
            },
          },
        }
      )
    })

    it('should handle commit without source image', async () => {
      const paramsWithoutImage = { ...validParams, sourceImagePath: null, sourceImageUrl: null }

      mockFunctionsInvoke.mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      })

      const result = await commitReviewedVendor(paramsWithoutImage)

      expect(result).toEqual(mockSuccessResponse)
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'commit-reviewed-vendor-document',
        {
          body: expect.objectContaining({
            source_image: null,
          }),
        }
      )
    })
  })

  describe('Company name validation', () => {
    it('should throw validation_error for empty company_name', async () => {
      const invalidParams = {
        ...validParams,
        reviewedDocument: {
          company_name: '',
        } as ReviewedVendorDocument,
      }

      await expect(commitReviewedVendor(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: 'Company name is required',
      } as CommitError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })

    it('should throw validation_error for whitespace-only company_name', async () => {
      const invalidParams = {
        ...validParams,
        reviewedDocument: {
          company_name: '   ',
        } as ReviewedVendorDocument,
      }

      await expect(commitReviewedVendor(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: 'Company name is required',
      } as CommitError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })
  })

  describe('UUID validation', () => {
    it('should throw validation_error for invalid scan_session_id', async () => {
      const invalidParams = {
        ...validParams,
        scanSessionId: 'not-a-uuid',
      }

      await expect(commitReviewedVendor(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('scan_session_id'),
      } as CommitError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })

    it('should throw validation_error for invalid event_id', async () => {
      const invalidParams = {
        ...validParams,
        eventId: 'invalid-uuid',
      }

      await expect(commitReviewedVendor(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('event_id'),
      } as CommitError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })
  })

  describe('Already committed handling', () => {
    it('should throw validation_error for already committed scan session', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { name: 'Error', message: 'already committed' },
      })

      await expect(commitReviewedVendor(validParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: 'Vendor already committed for this scan session',
      } as CommitError)
    })
  })

  describe('Network error handling', () => {
    it('should wrap network errors as unknown_error', async () => {
      const networkError = new Error('Network request failed')
      mockFunctionsInvoke.mockRejectedValue(networkError)

      await expect(commitReviewedVendor(validParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'Network request failed',
      } as CommitError)
    })

    it('should handle edge function error response', async () => {
      const errorMessage = 'Database connection failed'
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { name: 'Error', message: errorMessage },
      })

      await expect(commitReviewedVendor(validParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: errorMessage,
      } as CommitError)
    })

    it('should handle null response from edge function', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: null,
      })

      await expect(commitReviewedVendor(validParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'No response from commit function',
      } as CommitError)
    })
  })
})

describe('isVendorAlreadyCommitted', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return true when vendor_id exists', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { vendor_id: '456e7890-e89b-12d3-a456-426614174000' },
      error: null,
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await isVendorAlreadyCommitted('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('scan_sessions')
    expect(mockSelect).toHaveBeenCalledWith('vendor_id')
    expect(mockEq).toHaveBeenCalledWith('id', '123e4567-e89b-12d3-a456-426614174000')
  })

  it('should return false when vendor_id is null', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { vendor_id: null },
      error: null,
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await isVendorAlreadyCommitted('123e4567-e89b-12d3-a456-426614174000')

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

    const result = await isVendorAlreadyCommitted('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toBe(false)
  })
})

describe('getCommittedVendorId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return vendor_id when exists', async () => {
    const vendorId = '456e7890-e89b-12d3-a456-426614174000'
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { vendor_id: vendorId },
      error: null,
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await getCommittedVendorId('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toBe(vendorId)
  })

  it('should return null when vendor_id is null', async () => {
    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { vendor_id: null },
      error: null,
    })

    mockFrom.mockReturnValue({ select: mockSelect, eq: mockEq, single: mockSingle } as any)
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
    mockEq.mockReturnValue({ single: mockSingle })

    const result = await getCommittedVendorId('123e4567-e89b-12d3-a456-426614174000')

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

    const result = await getCommittedVendorId('123e4567-e89b-12d3-a456-426614174000')

    expect(result).toBeNull()
  })
})
