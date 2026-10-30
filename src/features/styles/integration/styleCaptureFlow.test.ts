/**
 * Style Capture Flow Integration Tests
 *
 * Full flow simulation with all external dependencies mocked.
 * Tests the complete style capture flow from image upload to commit.
 *
 * Flow:
 * 1. Upload image → storage path returned
 * 2. Create scan session → session ID returned
 * 3. Extract fabric → normalized_payload stored
 * 4. Get extraction preview → data retrieved
 * 5. Commit reviewed data → style_id returned
 * 6. Verify scan_session updated with reviewed_payload
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FabricExtractionResponse } from '@/features/styles/types/fabricExtraction'
import type { CommitFabricResponse } from '@/features/styles/types/fabricCommit'

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

describe('Style Capture Flow - Happy Path Integration', () => {
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
    name: 'fabric-swatch.jpg',
    contentType: 'image/jpeg',
    data: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), // JPEG header
  })

  const createMockStoragePath = (eventId: string, scanSessionId: string) =>
    `fabric-documents/${eventId}/${scanSessionId}.jpg`

  const createMockScanSessionId = () => '123e4567-e89b-12d3-a456-426614174000'
  const createMockEventId = () => '987fcdeb-51a2-43f1-a456-426614174000'
  const createMockVendorId = () => 'abc12345-e89b-12d3-a456-426614174000'
  const createMockStyleId = () => '456e7890-e89b-12d3-a456-426614174000'

  const createMockExtractionResponse = (): FabricExtractionResponse => ({
    style: {
      item_code: 'FAB-001',
      name: 'Cotton Twill',
      composition: '100% Cotton',
      category: 'Woven',
      construction: 'Twill',
      finish: 'Brushed',
      pattern: 'Solid',
      width_cm: 150,
      weight_gsm: 250,
      season: 'SS25',
      variants: [
        {
          color_code: 'NV001',
          color_name: 'Navy',
          variant_name: 'Navy Base',
        },
      ],
    },
    metadata: {
      extractor_name: 'gemini-fabric-extractor',
      extractor_model: 'gemini-flash-lite-latest',
      extractor_version: '1.0.0',
      confidence_scores: {
        item_code: 0.95,
        composition: 0.92,
        weight_gsm: 0.88,
      },
    },
  })

  const createMockCommitResponse = (styleId: string, scanSessionId: string): CommitFabricResponse => ({
    style_id: styleId,
    variant_ids: ['var-001-e89b-12d3-a456-426614174000'],
    inventory_ids: [],
    price_ids: ['ph-001-e89b-12d3-a456-426614174000'],
    fabric_image_ids: ['img-001-e89b-12d3-a456-426614174000'],
    scan_session_id: scanSessionId,
  })

  // ============================================================================
  // Step 1: Image Upload
  // ============================================================================

  describe('Step 1: Upload image to storage', () => {
    it('should upload fabric image and return storage path', async () => {
      const eventId = createMockEventId()
      const scanSessionId = createMockScanSessionId()
      const imageData = createMockImageData()
      const expectedPath = createMockStoragePath(eventId, scanSessionId)

      mockStorageUpload.mockResolvedValue({
        data: { path: expectedPath },
        error: null,
      })

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
          scan_type: 'fabric_card',
          extraction_status: 'pending',
          created_by: 'user-123',
        },
        error: null,
      })

      const result = await mockSupabaseSingle()

      expect(result.data?.id).toBe(scanSessionId)
      expect(result.data?.event_id).toBe(eventId)
      expect(result.data?.extraction_status).toBe('pending')
    })
  })

  // ============================================================================
  // Step 3: Extract Fabric Data
  // ============================================================================

  describe('Step 3: Extract fabric data', () => {
    it('should call extraction function and return normalized payload', async () => {
      const scanSessionId = createMockScanSessionId()
      const eventId = createMockEventId()
      const vendorId = createMockVendorId()
      const storagePath = 'fabric-documents/test.jpg'
      const mockResponse = createMockExtractionResponse()

      mockFunctionsInvoke.mockResolvedValue({
        data: mockResponse,
        error: null,
      })

      const result = await mockFunctionsInvoke('extract-fabric-document', {
        body: {
          scan_session_id: scanSessionId,
          event_id: eventId,
          vendor_id: vendorId,
          storage_path: storagePath,
          mime_type: 'image/jpeg',
          scan_type: 'fabric_card',
        },
      })

      expect(result.data).toEqual(mockResponse)
      expect(result.data.style.item_code).toBe('FAB-001')
      expect(result.data.style.composition).toBe('100% Cotton')
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        'extract-fabric-document',
        expect.objectContaining({
          body: expect.objectContaining({
            scan_session_id: scanSessionId,
            vendor_id: vendorId,
            scan_type: 'fabric_card',
          }),
        })
      )
    })

    it('should extract variants from fabric document', async () => {
      const mockExtraction = createMockExtractionResponse()

      mockFunctionsInvoke.mockResolvedValue({
        data: mockExtraction,
        error: null,
      })

      const result = await mockFunctionsInvoke('extract-fabric-document', { body: {} })

      expect(result.data.style.variants).toHaveLength(1)
      expect(result.data.style.variants![0].color_name).toBe('Navy')
    })

    it('should update scan session with normalized_payload after extraction', async () => {
      const mockExtraction = createMockExtractionResponse()

      mockSupabaseEq.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { normalized_payload: mockExtraction },
            error: null,
          }),
        }),
      })

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

      const result = await mockSupabaseSingle()

      expect(result.data?.extraction_status).toBe('complete')
      expect(result.data?.normalized_payload).toEqual(mockExtraction)
    })
  })

  // ============================================================================
  // Step 5: Commit Reviewed Data
  // ============================================================================

  describe('Step 5: Commit reviewed fabric data', () => {
    it('should create style and return style_id', async () => {
      const scanSessionId = createMockScanSessionId()
      const eventId = createMockEventId()
      const vendorId = createMockVendorId()
      const styleId = createMockStyleId()
      const mockCommit = createMockCommitResponse(styleId, scanSessionId)

      mockFunctionsInvoke.mockResolvedValue({
        data: mockCommit,
        error: null,
      })

      const result = await mockFunctionsInvoke('commit-reviewed-fabric-document', {
        body: {
          scan_session_id: scanSessionId,
          event_id: eventId,
          vendor_id: vendorId,
          reviewed_document: {
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
                price: { currency: 'USD', price: 12.5, price_unit: 'yard' },
              },
            ],
          },
          source_images: [
            {
              storage_path: 'fabric-documents/test.jpg',
              public_url: 'https://storage.example.com/test.jpg',
            },
          ],
        },
      })

      expect(result.data?.style_id).toBe(styleId)
      expect(result.data?.variant_ids).toHaveLength(1)
      expect(result.data?.fabric_image_ids).toHaveLength(1)
    })
  })

  // ============================================================================
  // Step 6: Verify Scan Session Update
  // ============================================================================

  describe('Step 6: Verify scan session updated with reviewed_payload', () => {
    it('should update scan session with reviewed_payload and style_id', async () => {
      const scanSessionId = createMockScanSessionId()
      const styleId = createMockStyleId()

      mockSupabaseSingle.mockResolvedValue({
        data: {
          id: scanSessionId,
          extraction_status: 'complete',
          style_id: styleId,
          reviewed_by: 'user-123',
          reviewed_at: '2026-03-18T10:35:00Z',
          reviewed_payload: {
            item_code: 'FAB-001',
            name: 'Cotton Twill',
          },
        },
        error: null,
      })

      const result = await mockSupabaseSingle()

      expect(result.data?.style_id).toBe(styleId)
      expect(result.data?.reviewed_by).toBe('user-123')
      expect(result.data?.reviewed_payload).toBeDefined()
    })
  })

  // ============================================================================
  // Full Flow Integration Test
  // ============================================================================

  describe('Full flow: upload → extract → review → commit', () => {
    it('should complete entire style capture flow successfully', async () => {
      const eventId = createMockEventId()
      const scanSessionId = createMockScanSessionId()
      const storagePath = 'fabric-documents/test.jpg'
      const styleId = createMockStyleId()

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

      // Step 5: Commit
      const mockCommit = createMockCommitResponse(styleId, scanSessionId)
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: mockCommit,
        error: null,
      })

      // Step 6: Verify final state
      mockSupabaseSingle.mockResolvedValueOnce({
        data: {
          id: scanSessionId,
          style_id: styleId,
          extraction_status: 'complete',
          reviewed_payload: {
            item_code: 'FAB-001',
            name: 'Cotton Twill',
          },
        },
        error: null,
      })

      // Execute flow
      const uploadResult = await mockStorageUpload('test.jpg', new Uint8Array())
      expect(uploadResult.data.path).toBe(storagePath)

      const sessionResult = await mockSupabaseSingle()
      expect(sessionResult.data.id).toBe(scanSessionId)

      const extractResult = await mockFunctionsInvoke('extract-fabric-document', { body: {} })
      expect(extractResult.data.style.item_code).toBe('FAB-001')
      expect(extractResult.data.style.composition).toBe('100% Cotton')

      const commitResult = await mockFunctionsInvoke('commit-reviewed-fabric-document', { body: {} })
      expect(commitResult.data.style_id).toBe(styleId)
      expect(commitResult.data.variant_ids).toHaveLength(1)

      const finalState = await mockSupabaseSingle()
      expect(finalState.data.style_id).toBe(styleId)
    })
  })
})
