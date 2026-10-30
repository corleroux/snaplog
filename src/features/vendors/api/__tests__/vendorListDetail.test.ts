/**
 * Vendor List/Detail Flow Tests
 *
 * Tests the vendor list and detail retrieval paths:
 * - SupabaseVendorRepository.getByEvent()
 * - SupabaseVendorRepository.getById()
 * - getVendor API function
 * - getVendors API function (repository wrapper)
 * - Empty result handling
 * - Vendor not found
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseChain } from '@/test/supabaseMocks'
import { createVendor, resetFactoryIds } from '@/test/factories'
import {
  SupabaseVendorRepository,
} from '../vendorRepository'
import {
  vendorImageToVendorImageRecord,
} from '../vendorMappers'
import type { VendorImage } from '@/lib/supabase/types'

// Mock storageUrls to provide stable URLs
vi.mock('@/lib/upload/storageUrls', () => ({
  storagePathToPublicUrl: (path: string) => `https://example.supabase.co/storage/v1/object/public/scan-originals/${path}`,
  isSignedUrl: (url: string) => {
    try { return new URL(url).searchParams.has('token') } catch { return false }
  },
}))

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

const makeVendorRow = (overrides: Record<string, unknown> = {}): any =>
  createVendor(overrides as any)

const makeImageRow = (overrides: Partial<VendorImage> = {}): VendorImage => ({
  id: 'img-1',
  vendor_id: 'v-1',
  event_id: 'evt-1',
  storage_path: 'scans/img.jpg',
  public_url: 'https://example.com/img.jpg',
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
  ...overrides,
})

describe('SupabaseVendorRepository.getByEvent', () => {
  let repository: SupabaseVendorRepository

  beforeEach(() => {
    resetFactoryIds()
    vi.clearAllMocks()
    repository = new SupabaseVendorRepository()
  })

  it('should return vendors for correct event with images', async () => {
    const vendors = [
      makeVendorRow({ id: 'v-1', company_name: 'Vendor A' }),
      makeVendorRow({ id: 'v-2', company_name: 'Vendor B' }),
    ]
    const images = [
      makeImageRow({ vendor_id: 'v-1', is_primary: true }),
      makeImageRow({ vendor_id: 'v-2', is_primary: false }),
    ]
    // style counts for the style-count badge (added in commit 2da4496)
    const styleCounts = [
      { vendor_id: 'v-1' },
      { vendor_id: 'v-1' },
      { vendor_id: 'v-2' },
    ]

    // Call 1: vendors query
    const vendorsChain = createMockSupabaseChain({ data: vendors, error: null })
    // Call 2 (Promise.all[0]): vendor_images query
    const imagesChain = createMockSupabaseChain({ data: images, error: null })
    // Call 3 (Promise.all[1]): fabric_styles style-count query
    const styleCountChain = createMockSupabaseChain({ data: styleCounts, error: null })

    mockFrom
      .mockReturnValueOnce(vendorsChain as any)
      .mockReturnValueOnce(imagesChain as any)
      .mockReturnValueOnce(styleCountChain as any)

    const result = await repository.getByEvent('evt-1')

    expect(result).toHaveLength(2)
    expect(result[0].companyName).toBe('Vendor A')
    expect(result[0].images).toHaveLength(1)
    expect(result[1].companyName).toBe('Vendor B')
    expect(result[1].images).toHaveLength(1)
    expect(mockFrom).toHaveBeenCalledWith('vendors')
    expect(mockFrom).toHaveBeenCalledWith('vendor_images')
    expect(mockFrom).toHaveBeenCalledWith('fabric_styles')
  })

  it('should return empty array when no vendors found', async () => {
    const vendorsChain = createMockSupabaseChain({ data: [], error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })
    const styleCountChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(vendorsChain as any)
      .mockReturnValueOnce(imagesChain as any)
      .mockReturnValueOnce(styleCountChain as any)

    const result = await repository.getByEvent('evt-empty')
    expect(result).toEqual([])
  })

  it('should throw on database error', async () => {
    const chain = createMockSupabaseChain({
      data: null,
      error: { message: 'DB error' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(repository.getByEvent('evt-1')).rejects.toEqual(
      expect.objectContaining({ message: 'DB error' })
    )
  })

  it('should handle vendors without images', async () => {
    const vendors = [makeVendorRow({ id: 'v-1' })]
    const vendorsChain = createMockSupabaseChain({ data: vendors, error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(vendorsChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.getByEvent('evt-1')
    expect(result).toHaveLength(1)
    expect(result[0].images).toEqual([])
  })
})

describe('SupabaseVendorRepository.getById', () => {
  let repository: SupabaseVendorRepository

  beforeEach(() => {
    resetFactoryIds()
    vi.clearAllMocks()
    repository = new SupabaseVendorRepository()
  })

  it('should return vendor with images when found', async () => {
    const vendor = makeVendorRow({ id: 'v-1', company_name: 'Test Co.' })
    const images = [makeImageRow()]

    const vendorChain = createMockSupabaseChain({ data: vendor, error: null })
    const imagesChain = createMockSupabaseChain({ data: images, error: null })

    mockFrom
      .mockReturnValueOnce(vendorChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.getById('v-1')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('v-1')
    expect(result!.companyName).toBe('Test Co.')
    expect(result!.images).toHaveLength(1)
    expect(mockFrom).toHaveBeenCalledWith('vendors')
    expect(mockFrom).toHaveBeenCalledWith('vendor_images')
  })

  it('should return null when vendor not found', async () => {
    const chain = createMockSupabaseChain({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })
    mockFrom.mockReturnValue(chain as any)

    const result = await repository.getById('nonexistent')
    expect(result).toBeNull()
  })

  it('should throw on database error', async () => {
    const chain = createMockSupabaseChain({
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(repository.getById('v-1')).rejects.toEqual(
      expect.objectContaining({ code: '42P01' })
    )
  })

  it('should return vendor without images when none exist', async () => {
    const vendor = makeVendorRow()
    const vendorChain = createMockSupabaseChain({ data: vendor, error: null })
    const imagesChain = createMockSupabaseChain({ data: null, error: null })

    mockFrom
      .mockReturnValueOnce(vendorChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.getById('v-1')
    expect(result).not.toBeNull()
    expect(result!.images).toEqual([])
  })
})

describe('SupabaseVendorRepository.addImage (T3.1 regression)', () => {
  let repository: SupabaseVendorRepository

  beforeEach(() => {
    resetFactoryIds()
    vi.clearAllMocks()
    repository = new SupabaseVendorRepository()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } as any },
      error: null,
    })
  })

  it('resolves vendor event_id from DB before inserting image (not empty string)', async () => {
    // Call 1: fetch vendor.event_id — .select().eq().single() pattern
    const vendorChain = createMockSupabaseChain({ data: { event_id: 'evt-1' }, error: null })

    // Call 2: fetch existing images for display_order — .select().eq().order().limit() pattern
    // createMockChain has order() resolving as a Promise, but addImage chains .limit() after .order().
    // Build a dedicated chain where order() returns the chain (not a resolved Promise).
    const existingImagesChain: any = {}
    existingImagesChain.select = vi.fn().mockReturnValue(existingImagesChain)
    existingImagesChain.eq = vi.fn().mockReturnValue(existingImagesChain)
    existingImagesChain.is = vi.fn().mockReturnValue(existingImagesChain)
    existingImagesChain.order = vi.fn().mockReturnValue(existingImagesChain)
    existingImagesChain.limit = vi.fn().mockResolvedValue({ data: [], error: null })

    // Call 3: insert vendor_image
    const insertChain = createMockSupabaseChain({ error: null })

    mockFrom
      .mockReturnValueOnce(vendorChain as any)
      .mockReturnValueOnce(existingImagesChain as any)
      .mockReturnValueOnce(insertChain as any)

    await repository.addImage('v-1', {
      id: 'img-new',
      uri: 'https://example.com/new.jpg',
    })

    // The insert chain should have been called with event_id from the vendor lookup
    expect(mockFrom).toHaveBeenCalledWith('vendors')
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: 'evt-1' })
    )
    // Must NOT be an empty string (the pre-fix bug)
    expect(insertChain.insert).not.toHaveBeenCalledWith(
      expect.objectContaining({ event_id: '' })
    )
  })

  it('throws when vendor cannot be resolved for event_id', async () => {
    const chain = createMockSupabaseChain({ data: null, error: { message: 'Not found' } })
    mockFrom.mockReturnValue(chain as any)

    await expect(
      repository.addImage('nonexistent', { id: 'img', uri: 'https://x.com/x.jpg' })
    ).rejects.toThrow('Cannot resolve event_id for vendor nonexistent')
  })
})

describe('vendorImageToVendorImageRecord', () => {
  it('should use public_url when it is a valid non-signed URL', () => {
    const row = makeImageRow({
      public_url: 'https://example.supabase.co/storage/v1/object/public/scan-originals/scans/img.jpg',
      caption: 'Booth photo',
    })

    const record = vendorImageToVendorImageRecord(row)

    expect(record.id).toBe('img-1')
    expect(record.uri).toBe('https://example.supabase.co/storage/v1/object/public/scan-originals/scans/img.jpg')
    expect(record.caption).toBe('Booth photo')
  })

  it('should generate public URL from storage_path when public_url is null', () => {
    const row = makeImageRow({
      public_url: null,
      storage_path: 'scans/img.jpg',
    })

    const record = vendorImageToVendorImageRecord(row)
    expect(record.uri).toBe('https://example.supabase.co/storage/v1/object/public/scan-originals/scans/img.jpg')
  })

  it('should generate public URL from storage_path when public_url is an expired signed URL', () => {
    const row = makeImageRow({
      public_url: 'https://example.supabase.co/storage/v1/object/sign/scan-originals/scans/img.jpg?token=expired-abc123',
      storage_path: 'scans/img.jpg',
    })

    const record = vendorImageToVendorImageRecord(row)
    expect(record.uri).toBe('https://example.supabase.co/storage/v1/object/public/scan-originals/scans/img.jpg')
    expect(record.uri).not.toContain('token=')
  })
})
