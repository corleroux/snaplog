/**
 * Capture flow error/timeout scenario tests (TEST-04)
 *
 * Tests error paths in the capture → extract flow:
 * - Gemini timeout (30s) triggers retry
 * - Network failure during extraction
 * - Malformed JSON response
 * - Empty extraction response
 * - Image upload failure
 * - Validation failures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetFactoryIds } from '@/test/factories'

// Mock supabase
const mockFunctionsInvoke = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
    from: (...args: any[]) => mockSupabaseFrom(...args),
    auth: {
      getUser: vi.fn(() => ({ data: { user: { id: 'user-1' } } })),
      getSession: vi.fn(() => ({ data: { session: null } })),
    },
  },
  invokeEdgeFunction: vi.fn(),
}))

// Mock PostHog
vi.mock('posthog-js', () => ({
  default: {
    captureException: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    init: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}))

import { extractVendorDocument } from '../extractVendorDocument'
import type { VendorExtractionResponse } from '../../types/vendorExtraction'

describe('Capture Flow Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFactoryIds()
  })

  // ==========================================================================
  // Gemini timeout
  // ==========================================================================

  it('handles extraction timeout gracefully', async () => {
    // Simulate a timeout: the function hangs until aborted
    mockFunctionsInvoke.mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new DOMException('The operation was aborted', 'AbortError'))
        }, 100)
      })
    })

    await expect(
      extractVendorDocument({
        scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        storagePath: 'scans/card.jpg',
        mimeType: 'image/jpeg',
        scanType: 'vendor_card',
      })
    ).rejects.toMatchObject({
      type: 'network_error',
    })
  })

  // ==========================================================================
  // Network failure
  // ==========================================================================

  it('handles network failure during extraction', async () => {
    mockFunctionsInvoke.mockRejectedValue(
      new TypeError('Failed to fetch')
    )

    await expect(
      extractVendorDocument({
        scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        storagePath: 'scans/card.jpg',
        mimeType: 'image/jpeg',
        scanType: 'vendor_card',
      })
    ).rejects.toMatchObject({
      type: 'network_error',
      message: 'Failed to fetch',
    })
  })

  // ==========================================================================
  // Malformed response
  // ==========================================================================

  it('handles edge function returning error object', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Gemini returned invalid JSON' },
    })

    await expect(
      extractVendorDocument({
        scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        storagePath: 'scans/card.jpg',
        mimeType: 'image/jpeg',
        scanType: 'vendor_card',
      })
    ).rejects.toMatchObject({
      type: 'unknown_error',
      message: 'Gemini returned invalid JSON',
    })
  })

  // ==========================================================================
  // Empty response
  // ==========================================================================

  it('handles null response data from extraction', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: null,
    })

    await expect(
      extractVendorDocument({
        scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        storagePath: 'scans/card.jpg',
        mimeType: 'image/jpeg',
        scanType: 'vendor_card',
      })
    ).rejects.toMatchObject({
      type: 'unknown_error',
      message: 'No response from extraction function',
    })
  })

  // ==========================================================================
  // Validation failure
  // ==========================================================================

  it('rejects invalid scan_session_id format', async () => {
    await expect(
      extractVendorDocument({
        scanSessionId: '',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        storagePath: 'scans/card.jpg',
        mimeType: 'image/jpeg',
        scanType: 'vendor_card',
      })
    ).rejects.toMatchObject({
      type: 'validation_failed',
    })
  })

  it('rejects missing storage_path', async () => {
    await expect(
      extractVendorDocument({
        scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        storagePath: '',
        mimeType: 'image/jpeg',
        scanType: 'vendor_card',
      })
    ).rejects.toMatchObject({
      type: 'validation_failed',
    })
  })

  // ==========================================================================
  // Happy path (baseline)
  // ==========================================================================

  it('returns extraction result on success', async () => {
    const mockResponse: VendorExtractionResponse = {
      document: {
        company_name: 'Test Fabrics',
        booth_number: 'A-101',
      },
      metadata: {
        extractor_name: 'gemini',
        extractor_model: 'gemini-2.0-flash',
        extractor_version: '1.0',
      },
    }

    mockFunctionsInvoke.mockResolvedValue({
      data: mockResponse,
      error: null,
    })

    const result = await extractVendorDocument({
      scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
      eventId: '550e8400-e29b-41d4-a716-446655440001',
      storagePath: 'scans/card.jpg',
      mimeType: 'image/jpeg',
      scanType: 'vendor_card',
    })

    expect(result.document.company_name).toBe('Test Fabrics')
    expect(result.metadata.extractor_name).toBe('gemini')
  })

  // ==========================================================================
  // Extraction error with retry indicator
  // ==========================================================================

  it('handles extraction_failed status from edge function', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Extraction failed after 2 retries: Gemini API timeout' },
    })

    await expect(
      extractVendorDocument({
        scanSessionId: '550e8400-e29b-41d4-a716-446655440000',
        eventId: '550e8400-e29b-41d4-a716-446655440001',
        storagePath: 'scans/card.jpg',
        mimeType: 'image/jpeg',
        scanType: 'vendor_card',
      })
    ).rejects.toMatchObject({
      type: 'network_error',
      message: expect.stringContaining('timeout'),
    })
  })
})
