/**
 * Style Error Scenario Tests
 *
 * Tests error handling paths for:
 * - Extraction failures (edge function errors, null responses)
 * - Commit failures (validation, UUID, edge function errors)
 * - Scan session not found
 * - Partial failure consistency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractFabricDocument, type ExtractionError } from '../extractFabricDocument'
import { commitReviewedFabric } from '../commitReviewedFabricDocument'
import type { ReviewedFabricDocument, CommitError } from '@/features/styles/types/fabricCommit'

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
const mockFunctionsInvoke = vi.mocked(supabase.functions.invoke)
const mockInvokeEdgeFunction = vi.mocked(invokeEdgeFunction)

const validExtractionParams = {
  scanSessionId: '123e4567-e89b-12d3-a456-426614174000',
  eventId: '987fcdeb-51a2-43f1-a456-426614174000',
  vendorId: 'abc12345-e89b-12d3-a456-426614174000',
  storagePath: 'fabric-documents/test.jpg',
  mimeType: 'image/jpeg',
  scanType: 'fabric_card',
}

const validCommitParams = {
  scanSessionId: '123e4567-e89b-12d3-a456-426614174000',
  eventId: '987fcdeb-51a2-43f1-a456-426614174000',
  vendorId: 'abc12345-e89b-12d3-a456-426614174000',
  reviewedDocument: {
    style: { item_code: 'FAB-001' },
  } as ReviewedFabricDocument,
  sourceImagePath: 'fabric-documents/test.jpg',
  sourceImageUrl: 'https://storage.example.com/test.jpg',
}

describe('Style Error Scenarios', () => {
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
        extractFabricDocument(validExtractionParams)
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
        extractFabricDocument(validExtractionParams)
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
        extractFabricDocument(validExtractionParams)
      ).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'No response from extraction function',
      } as ExtractionError)
    })

    it('should throw network_error on network rejection', async () => {
      mockFunctionsInvoke.mockRejectedValue(new Error('Network request failed'))

      await expect(
        extractFabricDocument(validExtractionParams)
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
        extractFabricDocument(badParams)
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
        extractFabricDocument(validExtractionParams)
      ).rejects.toMatchObject({
        type: 'unknown_error',
      } as ExtractionError)
    })
  })

  describe('Commit failures', () => {
    it('should throw validation_failed for missing style data', async () => {
      const params = {
        ...validCommitParams,
        reviewedDocument: { style: null } as any,
      }

      await expect(commitReviewedFabric(params)).rejects.toMatchObject({
        type: 'validation_failed',
        message: 'Style data is required',
      } as CommitError)
    })

    it('should throw validation_failed for invalid scan_session_id', async () => {
      const params = {
        ...validCommitParams,
        scanSessionId: 'not-a-uuid',
      }

      await expect(commitReviewedFabric(params)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('scan_session_id'),
      } as CommitError)
    })

    it('should throw validation_failed for invalid event_id', async () => {
      const params = {
        ...validCommitParams,
        eventId: 'invalid',
      }

      await expect(commitReviewedFabric(params)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('event_id'),
      } as CommitError)
    })

    it('should throw validation_failed for invalid vendor_id', async () => {
      const params = {
        ...validCommitParams,
        vendorId: 'invalid',
      }

      await expect(commitReviewedFabric(params)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('vendor_id'),
      } as CommitError)
    })

    it('should throw validation_failed for already committed scan session', async () => {
      mockInvokeEdgeFunction.mockResolvedValue({
        data: null,
        error: { name: 'Error', message: 'Fabric already committed for this scan session' },
      })

      await expect(commitReviewedFabric(validCommitParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: 'Fabric already committed for this scan session',
      } as CommitError)
    })

    it('should throw unknown_error when edge function returns error', async () => {
      mockInvokeEdgeFunction.mockResolvedValue({
        data: null,
        error: { name: 'Error', message: 'Database connection failed' },
      })

      await expect(commitReviewedFabric(validCommitParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'Database connection failed',
      } as CommitError)
    })

    it('should throw unknown_error on network rejection during commit', async () => {
      mockInvokeEdgeFunction.mockRejectedValue(new Error('Network request failed'))

      await expect(commitReviewedFabric(validCommitParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'Network request failed',
      } as CommitError)
    })

    it('should throw unknown_error when edge function returns null data', async () => {
      mockInvokeEdgeFunction.mockResolvedValue({
        data: null,
        error: null,
      })

      await expect(commitReviewedFabric(validCommitParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'No response from commit function',
      } as CommitError)
    })
  })

  describe('Scan session not found', () => {
    it('isFabricAlreadyCommitted should return false when scan session not found', async () => {
      const { isFabricAlreadyCommitted } = await import('../commitReviewedFabricDocument')
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

      const result = await isFabricAlreadyCommitted('nonexistent-id')
      expect(result).toBe(false)
    })

    it('getCommittedStyleId should return null when scan session not found', async () => {
      const { getCommittedStyleId } = await import('../commitReviewedFabricDocument')
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

      const result = await getCommittedStyleId('nonexistent-id')
      expect(result).toBeNull()
    })

    it('isFabricExtractionComplete should return false when scan session not found', async () => {
      const { isFabricExtractionComplete } = await import('../extractFabricDocument')
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

      const result = await isFabricExtractionComplete('nonexistent-id')
      expect(result).toBe(false)
    })
  })
})
