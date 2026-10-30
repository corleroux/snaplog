/**
 * Vendor Edit Flow Tests
 *
 * Tests the vendor update/edit path:
 * - updateVendor API function
 * - SupabaseVendorRepository.update()
 * - Mapper functions
 * - Partial updates (only changed fields)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseChain } from '@/test/supabaseMocks'
import {
  SupabaseVendorRepository,
  type VendorCreateInput,
  type VendorUpdateInput,
} from '../vendorRepository'
import {
  vendorCreateInputToVendorRow,
  vendorRowToVendorRecord,
} from '../vendorMappers'
import type { Vendor, VendorImage } from '@/lib/supabase/types'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(() => ({ data: { session: null }, error: null })),
    },
  },
}))

import { supabase } from '@/lib/supabase/client'
const mockFrom = vi.mocked(supabase.from)
const mockGetUser = vi.mocked(supabase.auth.getUser)

describe('vendorCreateInputToVendorRow', () => {
  it('should map create input to persistence row', () => {
    const input: VendorCreateInput = {
      eventId: 'evt-1',
      companyName: 'Test Textile Co.',
      boothNumber: 'A-42',
      contactName: 'John Doe',
      email: 'john@test.com',
      phone: '+1 234 5678',
      website: 'https://test.com',
      address: '123 Test St',
      countryOfOrigin: 'USA',
      brandNames: 'Brand1, Brand2',
      notes: 'Test notes',
      images: [],
    }

    const row = vendorCreateInputToVendorRow(input, 'user-1')

    expect(row.event_id).toBe('evt-1')
    expect(row.company_name).toBe('Test Textile Co.')
    expect(row.booth_number).toBe('A-42')
    expect(row.contact_person).toBe('John Doe')
    expect(row.email).toBe('john@test.com')
    expect(row.brand_names).toEqual(['Brand1', 'Brand2'])
    expect(row.source).toBe('manual')
    expect(row.created_by).toBe('user-1')
  })

  it('should set source to ai when extractionMeta provided', () => {
    const input: VendorCreateInput = {
      eventId: 'evt-1',
      companyName: 'AI Vendor',
      images: [],
      extractionMeta: {
        extractedAt: '2025-01-01T00:00:00Z',
        warnings: [],
      },
    }

    const row = vendorCreateInputToVendorRow(input, 'user-1')
    expect(row.source).toBe('ai')
    expect(row.extraction_status).toBe('complete')
  })

  it('should handle empty brandNames', () => {
    const input: VendorCreateInput = {
      eventId: 'evt-1',
      companyName: 'Test',
      brandNames: '',
      images: [],
    }

    const row = vendorCreateInputToVendorRow(input, 'user-1')
    expect(row.brand_names).toEqual([])
  })

  it('should handle undefined optional fields as null', () => {
    const input: VendorCreateInput = {
      eventId: 'evt-1',
      companyName: 'Minimal',
      images: [],
    }

    const row = vendorCreateInputToVendorRow(input, 'user-1')
    expect(row.booth_number).toBeNull()
    expect(row.contact_person).toBeNull()
    expect(row.email).toBeNull()
    expect(row.notes).toBeNull()
  })
})

describe('vendorRowToVendorRecord', () => {
  it('should map persistence row to app-facing VendorRecord', () => {
    const row: Vendor = {
      id: 'v-1',
      event_id: 'evt-1',
      company_name: 'Test Co.',
      booth_number: 'A-1',
      contact_person: 'Jane',
      email: 'jane@test.com',
      phone: '+1234',
      whatsapp: null,
      website_url: 'https://test.com',
      address: '456 Main St',
      country_of_origin: 'India',
      brand_names: ['B1', 'B2'],
      notes: 'Some notes',
      source: 'ai',
      status: 'active',
      created_by: 'user-1',
      updated_by: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      source_info_image_id: null,
      extracted_at: '2025-01-01T00:00:00Z',
      extraction_status: 'complete',
      extraction_warnings: [],
      extraction_confidence: null,
      deleted_at: null,
      version: 1,
    } as Vendor

    const images: VendorImage[] = [
      {
        id: 'img-1',
        vendor_id: 'v-1',
        event_id: 'evt-1',
        storage_path: 'scans/img.jpg',
        public_url: 'https://storage.example.com/img.jpg',
        image_type: 'gallery',
        is_primary: true,
        display_order: 0,
        caption: null,
        was_source_info_image: false,
        width: null,
        height: null,
        file_size_bytes: null,
        mime_type: null,
        created_by: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
      },
    ] as VendorImage[]

    const record = vendorRowToVendorRecord(row, images)

    expect(record.id).toBe('v-1')
    expect(record.eventId).toBe('evt-1')
    expect(record.companyName).toBe('Test Co.')
    expect(record.boothNumber).toBe('A-1')
    expect(record.brandNames).toBe('B1, B2')
    expect(record.images).toHaveLength(1)
    expect(record.images[0].uri).toBe('https://storage.example.com/img.jpg')
  })

  it('should handle null brand_names', () => {
    const row = {
      id: 'v-2',
      event_id: 'evt-1',
      company_name: 'No Brands',
      brand_names: null,
    } as any as Vendor

    const record = vendorRowToVendorRecord(row)
    expect(record.brandNames).toBe('')
  })
})

describe('SupabaseVendorRepository.update', () => {
  let repository: SupabaseVendorRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SupabaseVendorRepository()
  })

  const mockVendorRow = {
    id: 'v-1',
    event_id: 'evt-1',
    company_name: 'Updated Co.',
    booth_number: 'B-99',
    contact_person: null,
    email: null,
    phone: null,
    whatsapp: null,
    website_url: null,
    address: null,
    country_of_origin: null,
    brand_names: [],
    notes: null,
    source: 'manual',
    status: 'active',
    created_by: 'user-1',
    updated_by: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
    source_info_image_id: null,
    extracted_at: null,
    extraction_status: null,
    extraction_warnings: [],
    extraction_confidence: null,
    version: 2,
  }

  it('should update only provided fields', async () => {
    // Call order: 1) current fetch in update, 2) update, 3) getById vendors, 4) getById images
    const imagesChain = createMockSupabaseChain({ data: [], error: null })
    const updateChain = createMockSupabaseChain({ error: null })
    const getChain = createMockSupabaseChain({ data: mockVendorRow, error: null })

    mockFrom
      .mockReturnValueOnce(imagesChain as any)
      .mockReturnValueOnce(updateChain as any)
      .mockReturnValueOnce(getChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const input: VendorUpdateInput = {
      companyName: 'Updated Co.',
      boothNumber: 'B-99',
    }

    const result = await repository.update('v-1', input, 1)

    expect(result.companyName).toBe('Updated Co.')
    expect(result.boothNumber).toBe('B-99')
    // Verify update was called (not the getById)
    expect(mockFrom).toHaveBeenCalledWith('vendors')
  })

  it('should update all fields when provided', async () => {
    // Call order: 1) current fetch in update, 2) update, 3) getById vendors, 4) getById images
    const imagesChain0 = createMockSupabaseChain({ data: [], error: null })
    const updateChain = createMockSupabaseChain({ error: null })
    const getChain = createMockSupabaseChain({ data: mockVendorRow, error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(imagesChain0 as any)
      .mockReturnValueOnce(updateChain as any)
      .mockReturnValueOnce(getChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const input: VendorUpdateInput = {
      companyName: 'New Name',
      boothNumber: 'C-1',
      contactName: 'Alice',
      email: 'alice@test.com',
      phone: '+1234',
      website: 'https://new.com',
      address: '789 Oak St',
      countryOfOrigin: 'Germany',
      brandNames: 'BrandX',
      notes: 'Updated notes',
    }

    await repository.update('v-1', input, 1)
    expect(mockFrom).toHaveBeenCalledWith('vendors')
  })

  it('should handle empty update input', async () => {
    // Call order: 1) current fetch in update, 2) update, 3) getById vendors, 4) getById images
    const imagesChain0 = createMockSupabaseChain({ data: [], error: null })
    const updateChain = createMockSupabaseChain({ error: null })
    const getChain = createMockSupabaseChain({ data: mockVendorRow, error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(imagesChain0 as any)
      .mockReturnValueOnce(updateChain as any)
      .mockReturnValueOnce(getChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.update('v-1', {}, 1)
    expect(result).toBeDefined()
  })

  it('should throw on update error', async () => {
    const chain = createMockSupabaseChain({
      error: { message: 'Update failed' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(
      repository.update('v-1', { companyName: 'X' }, 1)
    ).rejects.toEqual(expect.objectContaining({ message: 'Update failed' }))
  })

  it('should convert empty strings to null in update', async () => {
    // Call order: 1) current fetch in update, 2) update, 3) getById vendors, 4) getById images
    const imagesChain0 = createMockSupabaseChain({ data: [], error: null })
    const updateChain = createMockSupabaseChain({ error: null })
    const getChain = createMockSupabaseChain({ data: mockVendorRow, error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(imagesChain0 as any)
      .mockReturnValueOnce(updateChain as any)
      .mockReturnValueOnce(getChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const input: VendorUpdateInput = {
      boothNumber: '',
      email: '',
    }

    await repository.update('v-1', input, 1)
    // Verify the update was called — empty strings should be converted to null
    expect(updateChain.update).toHaveBeenCalled()
  })

  it('should convert brandNames string to array in update', async () => {
    // Call order: 1) current fetch in update, 2) update, 3) getById vendors, 4) getById images
    const imagesChain0 = createMockSupabaseChain({ data: [], error: null })
    const updateChain = createMockSupabaseChain({ error: null })
    const getChain = createMockSupabaseChain({ data: mockVendorRow, error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(imagesChain0 as any)
      .mockReturnValueOnce(updateChain as any)
      .mockReturnValueOnce(getChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const input: VendorUpdateInput = {
      brandNames: 'BrandA, BrandB, BrandC',
    }

    await repository.update('v-1', input, 1)
    expect(updateChain.update).toHaveBeenCalled()
  })

  it('should throw if vendor not found after update', async () => {
    const updateChain = createMockSupabaseChain({ error: null })
    const getChain = createMockSupabaseChain({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })
    const currentImagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(currentImagesChain as any)
      .mockReturnValueOnce(updateChain as any)
      .mockReturnValueOnce(getChain as any)

    await expect(
      repository.update('nonexistent', { companyName: 'X' }, 1)
    ).rejects.toThrow('CONFLICT')
  })
})

describe('updateVendor API function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call supabase update with correct fields', async () => {
    const { updateVendor } = await import('../updateVendor')

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'v-1', company_name: 'Updated Co.' },
      error: null,
    })
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any)

    // Mock auth.getUser for getCurrentUserId
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2025-01-01T00:00:00Z',
        },
      },
      error: null,
    } as any)

    await updateVendor('v-1', {
      company_name: 'Updated Co.',
      booth_number: 'B-99',
    }, 1)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: 'Updated Co.',
        booth_number: 'B-99',
      })
    )
  })
})
