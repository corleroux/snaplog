/**
 * Vendor Error Scenario Tests
 *
 * Tests error handling paths for:
 * - Extraction failures (edge function errors, null responses)
 * - Commit failures (after review)
 * - Scan session not found
 * - Partial failure consistency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractVendorDocument, type ExtractionError } from '../extractVendorDocument'
import { commitReviewedVendor } from '../commitReviewedVendor'
import type { ReviewedVendorDocument, CommitError } from '@/features/vendors/types/vendorCommit'

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
  refreshSession: vi.fn(),
}))

import { supabase, invokeEdgeFunction } from '@/lib/supabase/client'
const mockFunctionsInvoke = vi.mocked(supabase.functions.invoke)
const mockInvokeEdgeFunction = vi.mocked(invokeEdgeFunction)

const validExtractionParams = {
  scanSessionId: '123e4567-e89b-12d3-a456-426614174000',
  eventId: '987fcdeb-51a2-43f1-a456-426614174000',
  storagePath: 'vendor-documents/test.jpg',
  mimeType: 'image/jpeg',
  scanType: 'vendor_card' as const,
}

const validCommitParams = {
  scanSessionId: '123e4567-e89b-12d3-a456-426614174000',
  eventId: '987fcdeb-51a2-43f1-a456-426614174000',
  reviewedDocument: {
    company_name: 'Test Textile Co.',
  } as ReviewedVendorDocument,
  sourceImagePath: 'vendor-documents/test.jpg',
  sourceImageUrl: 'https://storage.example.com/test.jpg',
}

describe('Vendor Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Extraction failures', () => {
    it('should throw unknown_error when edge function returns error', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Gemini API rate limit exceeded' },
      })

      await expect(
        extractVendorDocument(validExtractionParams)
      ).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'Gemini API rate limit exceeded',
      } as ExtractionError)
    })

    it('should throw extraction_failed for internal server error', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Internal server error' },
      })

      await expect(
        extractVendorDocument(validExtractionParams)
      ).rejects.toMatchObject({
        type: 'extraction_failed',
      } as ExtractionError)
    })

    it('should throw unknown_error when edge function returns null data with no error', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: null,
      })

      await expect(
        extractVendorDocument(validExtractionParams)
      ).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'No response from extraction function',
      } as ExtractionError)
    })

    it('should throw network_error on network rejection', async () => {
      mockFunctionsInvoke.mockRejectedValue(new Error('Network request failed'))

      await expect(
        extractVendorDocument(validExtractionParams)
      ).rejects.toMatchObject({
        type: 'network_error',
        message: 'Network request failed',
      } as ExtractionError)
    })

    it('should throw validation_failed before calling edge function for bad input', async () => {
      const badParams = {
        ...validExtractionParams,
        scanSessionId: 'not-a-uuid',
      }

      await expect(
        extractVendorDocument(badParams)
      ).rejects.toMatchObject({
        type: 'validation_failed',
      } as ExtractionError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })

    it('should handle malformed edge function response gracefully', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Failed to parse response' },
      })

      await expect(
        extractVendorDocument(validExtractionParams)
      ).rejects.toMatchObject({
        type: 'unknown_error',
      } as ExtractionError)
    })
  })

  describe('Commit failures', () => {
    it('should throw validation_failed for empty company_name', async () => {
      const params = {
        ...validCommitParams,
        reviewedDocument: { company_name: '' } as ReviewedVendorDocument,
      }

      await expect(commitReviewedVendor(params)).rejects.toMatchObject({
        type: 'validation_failed',
        message: 'Company name is required',
      } as CommitError)

      expect(mockInvokeEdgeFunction).not.toHaveBeenCalled()
    })

    it('should throw validation_failed for whitespace-only company_name', async () => {
      const params = {
        ...validCommitParams,
        reviewedDocument: { company_name: '   ' } as ReviewedVendorDocument,
      }

      await expect(commitReviewedVendor(params)).rejects.toMatchObject({
        type: 'validation_failed',
        message: 'Company name is required',
      } as CommitError)
    })

    it('should throw validation_failed for invalid scan_session_id', async () => {
      const params = {
        ...validCommitParams,
        scanSessionId: 'not-a-uuid',
      }

      await expect(commitReviewedVendor(params)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('scan_session_id'),
      } as CommitError)
    })

    it('should throw validation_failed for invalid event_id', async () => {
      const params = {
        ...validCommitParams,
        eventId: 'invalid',
      }

      await expect(commitReviewedVendor(params)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('event_id'),
      } as CommitError)
    })

    it('should throw unknown_error when edge function returns error', async () => {
      mockInvokeEdgeFunction.mockResolvedValue({
        data: null,
        error: { name: 'Error', message: 'Database connection failed' },
      })

      await expect(commitReviewedVendor(validCommitParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'Database connection failed',
      } as CommitError)
    })

    it('should throw unknown_error on network rejection during commit', async () => {
      mockInvokeEdgeFunction.mockRejectedValue(new Error('Network request failed'))

      await expect(commitReviewedVendor(validCommitParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'Network request failed',
      } as CommitError)
    })

    it('should throw unknown_error when edge function returns null data', async () => {
      mockInvokeEdgeFunction.mockResolvedValue({
        data: null,
        error: null,
      })

      await expect(commitReviewedVendor(validCommitParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'No response from commit function',
      } as CommitError)
    })
  })

  describe('Scan session not found', () => {
    it('isVendorAlreadyCommitted should return false when scan session not found', async () => {
      const { isVendorAlreadyCommitted } = await import('../commitReviewedVendor')
      const mockFrom = vi.mocked(supabase.from)

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any)

      const result = await isVendorAlreadyCommitted('nonexistent-id')
      expect(result).toBe(false)
    })

    it('getCommittedVendorId should return null when scan session not found', async () => {
      const { getCommittedVendorId } = await import('../commitReviewedVendor')
      const mockFrom = vi.mocked(supabase.from)

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      } as any)

      const result = await getCommittedVendorId('nonexistent-id')
      expect(result).toBeNull()
    })
  })
})
