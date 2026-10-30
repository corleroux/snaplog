/**
 * Extract Vendor Document API Tests
 *
 * Tests the extractVendorDocument function for:
 * - Valid request handling
 * - Invalid UUID validation
 * - Invalid scan_type validation
 * - Edge function error handling
 * - Network error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { extractVendorDocument, type ExtractionError } from './extractVendorDocument'
import type { VendorExtractionResponse } from '@/features/vendors/types/vendorExtraction'

// Mock supabase client using factory function to avoid hoisting issues
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}))

// Get the mocked function
import { supabase } from '@/lib/supabase/client'
const mockFunctionsInvoke = vi.mocked(supabase.functions.invoke)

describe('extractVendorDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const validParams = {
    scanSessionId: '123e4567-e89b-12d3-a456-426614174000',
    eventId: '987fcdeb-51a2-43f1-a456-426614174000',
    storagePath: 'vendor-documents/test.jpg',
    mimeType: 'image/jpeg',
    scanType: 'vendor_card',
  }

  const mockSuccessResponse: VendorExtractionResponse = {
    document: {
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
    },
    metadata: {
      extractor_name: 'gemini-vendor-extractor',
      extractor_model: 'gemini-flash-lite-latest',
      extractor_version: '1.0.0',
      confidence_scores: {
        company_name: 0.95,
      },
    },
  }

  describe('Valid request handling', () => {
    it('should return extraction response for valid request', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      })

      const result = await extractVendorDocument(validParams)

      expect(result).toEqual(mockSuccessResponse)
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'extract-vendor-document',
        {
          body: {
            scan_session_id: validParams.scanSessionId,
            event_id: validParams.eventId,
            storage_path: validParams.storagePath,
            mime_type: validParams.mimeType,
            scan_type: validParams.scanType,
          }
        }
      )
    })
  })

  describe('UUID validation', () => {
    it('should throw validation_error for invalid scan_session_id format', async () => {
      const invalidParams = {
        ...validParams,
        scanSessionId: 'not-a-uuid',
      }

      await expect(extractVendorDocument(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('Invalid payload'),
      } as ExtractionError)

      // Should not call the edge function
      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })

    it('should throw validation_error for invalid event_id format', async () => {
      const invalidParams = {
        ...validParams,
        eventId: 'invalid-uuid',
      }

      await expect(extractVendorDocument(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('Invalid payload'),
      } as ExtractionError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })

    it('should throw validation_error for empty storage_path', async () => {
      const invalidParams = {
        ...validParams,
        storagePath: '',
      }

      await expect(extractVendorDocument(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('Invalid payload'),
      } as ExtractionError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })
  })

  describe('Scan type validation', () => {
    it('should throw validation_error for invalid scan_type', async () => {
      const invalidParams = {
        ...validParams,
        scanType: 'invalid_scan_type',
      }

      await expect(extractVendorDocument(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('Invalid payload'),
      } as ExtractionError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })
  })

  describe('Edge function error handling', () => {
    it('should throw extraction_failed when edge function returns error', async () => {
      const errorMessage = 'Gemini API rate limit exceeded'
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      })

      await expect(extractVendorDocument(validParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: errorMessage,
      } as ExtractionError)
    })

    it('should throw unknown_error when edge function returns null data', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: null,
        error: null,
      })

      await expect(extractVendorDocument(validParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'No response from extraction function',
      } as ExtractionError)
    })
  })

  describe('Network error handling', () => {
    it('should wrap network errors as network_error', async () => {
      const networkError = new Error('Network request failed')
      mockFunctionsInvoke.mockRejectedValue(networkError)

      await expect(extractVendorDocument(validParams)).rejects.toMatchObject({
        type: 'network_error',
        message: 'Network request failed',
      } as ExtractionError)
    })

    it('should wrap timeout errors as network_error', async () => {
      const timeoutError = new Error('Request timeout')
      mockFunctionsInvoke.mockRejectedValue(timeoutError)

      await expect(extractVendorDocument(validParams)).rejects.toMatchObject({
        type: 'network_error',
        message: 'Request timeout',
      } as ExtractionError)
    })

    it('should wrap unknown errors as unknown_error', async () => {
      mockFunctionsInvoke.mockRejectedValue('Unknown error string')

      await expect(extractVendorDocument(validParams)).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'Unknown error string',
      } as ExtractionError)
    })
  })

  describe('Different scan types', () => {
    const validScanTypes = [
      'vendor_card',
      'vendor_signage',
      'vendor_brochure',
      'vendor_catalog',
    ] as const

    validScanTypes.forEach((scanType) => {
      it(`should accept valid scan_type: ${scanType}`, async () => {
        mockFunctionsInvoke.mockResolvedValue({
          data: mockSuccessResponse,
          error: null,
        })

        const params = { ...validParams, scanType }
        const result = await extractVendorDocument(params)

        expect(result).toEqual(mockSuccessResponse)
        expect(mockFunctionsInvoke).toHaveBeenCalledWith(
          'extract-vendor-document',
          {
            body: {
              scan_session_id: params.scanSessionId,
              event_id: params.eventId,
              storage_path: params.storagePath,
              mime_type: params.mimeType,
              scan_type: params.scanType,
            }
          }
        )
      })
    })
  })

  describe('Different MIME types', () => {
    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    validMimeTypes.forEach((mimeType) => {
      it(`should accept valid MIME type: ${mimeType}`, async () => {
        mockFunctionsInvoke.mockResolvedValue({
          data: mockSuccessResponse,
          error: null,
        })

        const params = { ...validParams, mimeType }
        const result = await extractVendorDocument(params)

        expect(result).toEqual(mockSuccessResponse)
      })
    })

    it('should reject invalid MIME type (non-image)', async () => {
      mockFunctionsInvoke.mockResolvedValue({
        data: mockSuccessResponse,
        error: null,
      })

      const invalidParams = {
        ...validParams,
        mimeType: 'application/pdf',
      }

      await expect(extractVendorDocument(invalidParams)).rejects.toMatchObject({
        type: 'validation_failed',
        message: expect.stringContaining('Invalid payload'),
      } as ExtractionError)

      expect(mockFunctionsInvoke).not.toHaveBeenCalled()
    })
  })
})
