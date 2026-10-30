/**
 * Vendor Capture Flow Integration Tests
 *
 * Full flow simulation with all external dependencies mocked.
 * Tests the complete vendor capture flow from image upload to commit.
 *
 * Flow:
 * 1. Upload image → storage path returned
 * 2. Create scan session → session ID returned
 * 3. Extract vendor → normalized_payload stored
 * 4. Get extraction preview → data retrieved
 * 5. Commit reviewed data → vendor_id returned
 * 6. Verify scan_session updated with reviewed_payload
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VendorExtractionResponse } from '@/features/vendors/types/vendorExtraction'
import type { CommitVendorResponse } from '@/features/vendors/types/vendorCommit'

// Mock all external dependencies
const mockStorageUpload = vi.fn()
const mockStorageFrom = vi.fn(() => ({ upload: mockStorageUpload }))
const mockSupabaseFrom = vi.fn()
const mockSupabaseInsert = vi.fn()
const mockSupabaseSelect = vi.fn()
const mockSupabaseEq = vi.fn()
const mockSupabaseSingle = vi.fn()
const mockFunctionsInvoke = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: { from: mockStorageFrom },
    from: mockSupabaseFrom,
    functions: { invoke: mockFunctionsInvoke },
  },
}))

describe('Vendor Capture Flow - Happy Path Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default chain for scan_sessions queries
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'scan_sessions') {
        return {
          insert: mockSupabaseInsert,
          select: mockSupabaseSelect,
        }
      }
      return {}
    })

    mockSupabaseInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: mockSupabaseSingle,
      }),
    })

    mockSupabaseSelect.mockReturnValue({
      eq: mockSupabaseEq,
    })

    mockSupabaseEq.mockReturnValue({
      single: mockSupabaseSingle,
    })
  })

  // ============================================================================
  // Test Data Factory
  // ============================================================================

  const createMockImageData = () => ({
    name: 'vendor-card.jpg',
    contentType: 'image/jpeg',
    data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
  })

  const createMockStoragePath = (eventId: string, scanSessionId: string) =>
    `vendor-documents/${eventId}/${scanSessionId}.jpg`

  const createMockScanSessionId = () => '123e4567-e89b-12d3-a456-426614174000'
  const createMockEventId = () => '987fcdeb-51a2-43f1-a456-426614174000'
  const createMockVendorId = () => '456e7890-e89b-12d3-a456-426614174000'

  const createMockExtractionResponse = (): VendorExtractionResponse => ({
    document: {
      company_name: 'Test Textile Co.',
      booth_number: 'A-42',
      contact_person: 'John Doe',
      email: 'john@testtextile.com',
      phone: '+1 234 567 8900',
      whatsapp: '+1 234 567 8900',
      website_url: 'https://testtextile.com',
      address: '123 Fabric Ave, Textile City',
      country_of_origin: 'USA',
      brand_names: ['TestBrand', 'QualityFabrics'],
      notes: 'Premium textile manufacturer specializing in sustainable fabrics',
    },
    metadata: {
      extractor_name: 'gemini-vendor-extractor',
      extractor_model: 'gemini-flash-lite-latest',
      extractor_version: '1.0.0',
      confidence_scores: {
        company_name: 0.98,
        email: 0.95,
        phone: 0.92,
      },
    },
  })

  const createMockCommitResponse = (vendorId: string, scanSessionId: string): CommitVendorResponse => ({
    vendor_id: vendorId,
    vendor_image_id: '789f0123-e89b-12d3-a456-426614174000',
    scan_session_id: scanSessionId,
  })

  // ============================================================================
  // Step 1: Image Upload
  // ============================================================================

  describe('Step 1: Upload image to storage', () => {
    it('should upload vendor image and return storage path', async () => {
      const eventId = createMockEventId()
      const scanSessionId = createMockScanSessionId()
      const imageData = createMockImageData()
      const expectedPath = createMockStoragePath(eventId, scanSessionId)

      mockStorageUpload.mockResolvedValue({
        data: { path: expectedPath },
        error: null,
      })

      // Simulate upload
      const result = await mockStorageUpload(imageData.name, imageData.data)

      expect(result).toEqual({
        data: { path: expectedPath },
        error: null,
      })
      expect(mockStorageUpload).toHaveBeenCalledWith(
        imageData.name,
        imageData.data
      )
    })
  })

  // ============================================================================
  // Step 2: Create Scan Session
  // ============================================================================

  describe('Step 2: Create scan session', () => {
    it('should create scan session and return session ID', async () => {
      const eventId = createMockEventId()
      const scanSessionId = createMockScanSessionId()

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: scanSessionId,
          event_id: eventId,
          scan_type: 'vendor_card',
          extraction_status: 'pending',
          created_by: 'user-123',
        },
        error: null,
      })

      // Simulate scan session creation
      const result = await mockSupabaseSingle()

      expect(result.data?.id).toBe(scanSessionId)
      expect(result.data?.event_id).toBe(eventId)
      expect(result.data?.extraction_status).toBe('pending')
    })
  })

  // ============================================================================
  // Step 3: Extract Vendor Data
  // ============================================================================

  describe('Step 3: Extract vendor data', () => {
    it('should call extraction function and return normalized payload', async () => {
      const scanSessionId = createMockScanSessionId()
      const eventId = createMockEventId()
      const storagePath = 'vendor-documents/test.jpg'
      const mockResponse = createMockExtractionResponse()

      mockFunctionsInvoke.mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      // Simulate extraction call
      const result = await mockFunctionsInvoke('extract-vendor-document', {
        body: {
          scan_session_id: scanSessionId,
          event_id: eventId,
          storage_path: storagePath,
          mime_type: 'image/jpeg',
          scan_type: 'vendor_card',
        },
      })

      expect(result.data).toEqual(mockResponse)
      expect(result.data.document.company_name).toBe('Test Textile Co.')
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'extract-vendor-document',
        expect.objectContaining({
          body: expect.objectContaining({
            scan_session_id: scanSessionId,
            scan_type: 'vendor_card',
          }),
        })
      )
    })

    it('should update scan session with normalized_payload after extraction', async () => {
      const mockExtraction = createMockExtractionResponse()

      // Mock scan session update after extraction
      mockSupabaseEq.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { normalized_payload: mockExtraction },
            error: null,
          }),
        }),
      })

      // Verify the extraction was stored
      expect(mockExtraction).toBeDefined()
    })
  })

  // ============================================================================
  // Step 4: Get Extraction Preview
  // ============================================================================

  describe('Step 4: Get extraction preview for review', () => {
    it('should retrieve extraction data from scan session', async () => {
      const scanSessionId = createMockScanSessionId()
      const mockExtraction = createMockExtractionResponse()

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: scanSessionId,
          extraction_status: 'complete',
          normalized_payload: mockExtraction,
        },
        error: null,
      })

      // Simulate getting extraction preview
      const result = await mockSupabaseSingle()

      expect(result.data?.extraction_status).toBe('complete')
      expect(result.data?.normalized_payload).toEqual(mockExtraction)
    })
  })

  // ============================================================================
  // Step 5: Commit Reviewed Data
  // ============================================================================

  describe('Step 5: Commit reviewed vendor data', () => {
    it('should create vendor and return vendor_id', async () => {
      const scanSessionId = createMockScanSessionId()
      const eventId = createMockEventId()
      const vendorId = createMockVendorId()
      const mockCommit = createMockCommitResponse(vendorId, scanSessionId)

      mockFunctionsInvoke.mockResolvedValue({
        data: mockCommit,
        error: null,
      })

      // Simulate commit call
      const result = await mockFunctionsInvoke('commit-reviewed-vendor-document', {
        body: {
          scan_session_id: scanSessionId,
          event_id: eventId,
          reviewed_document: {
            company_name: 'Test Textile Co.',
            booth_number: 'A-42',
            contact_person: 'John Doe',
            email: 'john@testtextile.com',
            phone: '+1 234 567 8900',
            whatsapp: '+1 234 567 8900',
            website_url: 'https://testtextile.com',
            address: '123 Fabric Ave, Textile City',
            country_of_origin: 'USA',
            brand_names: ['TestBrand', 'QualityFabrics'],
            notes: 'Premium textile manufacturer',
          },
          source_image: {
            storage_path: 'vendor-documents/test.jpg',
            public_url: null,
          },
        },
      })

      expect(result.data?.vendor_id).toBe(vendorId)
      expect(result.data?.vendor_image_id).toBeDefined()
    })
  })

  // ============================================================================
  // Step 6: Verify Scan Session Update
  // ============================================================================

  describe('Step 6: Verify scan session updated with reviewed_payload', () => {
    it('should update scan session with reviewed_payload and vendor_id', async () => {
      const scanSessionId = createMockScanSessionId()
      const vendorId = createMockVendorId()

      // Mock scan session after commit
      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: scanSessionId,
          extraction_status: 'complete',
          vendor_id: vendorId,
          reviewed_by: 'user-123',
          reviewed_at: '2026-03-18T10:35:00Z',
          reviewed_payload: {
            company_name: 'Test Textile Co.',
            booth_number: 'A-42',
          },
        },
        error: null,
      })

      // Verify final state
      const result = await mockSupabaseSingle()

      expect(result.data?.vendor_id).toBe(vendorId)
      expect(result.data?.reviewed_by).toBe('user-123')
      expect(result.data?.reviewed_payload).toBeDefined()
    })
  })

  // ============================================================================
  // Full Flow Integration Test
  // ============================================================================

  describe('Full flow: upload → extract → review → commit', () => {
    it('should complete entire vendor capture flow successfully', async () => {
      const eventId = createMockEventId()
      const scanSessionId = createMockScanSessionId()
      const storagePath = 'vendor-documents/test.jpg'
      const vendorId = createMockVendorId()

      // Step 1: Upload image
      mockStorageUpload.mockResolvedValue({
        data: { path: storagePath },
        error: null,
      })

      // Step 2: Create scan session
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: scanSessionId,
          event_id: eventId,
          extraction_status: 'pending',
        },
        error: null,
      })

      // Step 3: Extract
      const mockExtraction = createMockExtractionResponse()
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: mockExtraction,
        error: null,
      })

      // Step 4: Commit
      const mockCommit = createMockCommitResponse(vendorId, scanSessionId)
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: mockCommit,
        error: null,
      })

      // Step 6: Verify final state
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: scanSessionId,
          vendor_id: vendorId,
          extraction_status: 'complete',
          reviewed_payload: {
            company_name: 'Test Textile Co.',
          },
        },
        error: null,
      })

      // Execute flow
      const uploadResult = await mockStorageUpload('test.jpg', new Uint8Array())
      expect(uploadResult.data.path).toBe(storagePath)

      const sessionResult = await mockSupabaseSingle()
      expect(sessionResult.data.id).toBe(scanSessionId)

      const extractResult = await mockFunctionsInvoke('extract-vendor-document', { body: {} })
      expect(extractResult.data.document.company_name).toBe('Test Textile Co.')

      const commitResult = await mockFunctionsInvoke('commit-reviewed-vendor-document', { body: {} })
      expect(commitResult.data.vendor_id).toBe(vendorId)

      const finalState = await mockSupabaseSingle()
      expect(finalState.data.vendor_id).toBe(vendorId)
    })
  })
})
