/**
 * Style List/Detail Flow Tests
 *
 * Tests the style list and detail retrieval paths:
 * - SupabaseStyleRepository.getStylesByEvent()
 * - SupabaseStyleRepository.getStyle() (in edit flow tests)
 * - getStyleDetail API function
 * - getStyles API function
 * - getVariant API function
 * - Empty result handling
 * - Style not found
 * - Image grouping and association
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseChain } from '@/test/supabaseMocks'
import {
  SupabaseStyleRepository,
  type FabricStyleRow,
  type FabricImageRow,
} from '../styleRepository'

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

const makeStyleRow = (overrides: Partial<FabricStyleRow> = {}): FabricStyleRow => ({
  id: 's-1',
  event_id: 'evt-1',
  vendor_id: 'v-1',
  item_code: 'FAB-001',
  name: 'Cotton Twill',
  composition: '100% Cotton',
  category: 'Woven',
  construction: 'Twill',
  finish: null,
  pattern: null,
  width_cm: 150,
  width_in: null,
  weight_gsm: 250,
  weight_ozsy: null,
  season: null,
  supplier_ref: null,
  source_info_image_id: null,
  extracted_at: null,
  extraction_status: null,
  extraction_warnings: null,
  extraction_confidence: null,
  status: 'active',
  metadata: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

const makeImageRow = (overrides: Partial<FabricImageRow> = {}): FabricImageRow => ({
  id: 'img-1',
  style_id: 's-1',
  variant_id: null,
  vendor_id: 'v-1',
  event_id: 'evt-1',
  storage_path: 'fabrics/img.jpg',
  public_url: 'https://example.com/img.jpg',
  image_role: 'gallery',
  is_primary: true,
  display_order: 0,
  caption: null,
  was_source_info_image: false,
  width: null,
  height: null,
  file_size_bytes: null,
  mime_type: null,
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
})

describe('SupabaseStyleRepository.getStylesByEvent', () => {
  let repository: SupabaseStyleRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SupabaseStyleRepository()
  })

  it('should return styles for correct event with images', async () => {
    const styles = [
      makeStyleRow({ id: 's-1', name: 'Style A', event_id: 'evt-1' }),
      makeStyleRow({ id: 's-2', name: 'Style B', event_id: 'evt-1' }),
    ]
    const images = [
      makeImageRow({ style_id: 's-1', is_primary: true }),
      makeImageRow({ style_id: 's-2', is_primary: false }),
    ]
    // Latest prices for list card (added when price_history was wired to style list)
    const prices = [
      { style_id: 's-1', price: 12.5, currency: 'USD', price_unit: 'per_metre' },
    ]

    // Call 1: fabric_styles query
    const stylesChain = createMockSupabaseChain({ data: styles, error: null })
    // Call 2 (Promise.all[0]): fabric_images query
    const imagesChain = createMockSupabaseChain({ data: images, error: null })
    // Call 3 (Promise.all[1]): price_history query
    const pricesChain = createMockSupabaseChain({ data: prices, error: null })

    mockFrom
      .mockReturnValueOnce(stylesChain as any)
      .mockReturnValueOnce(imagesChain as any)
      .mockReturnValueOnce(pricesChain as any)

    const result = await repository.getStylesByEvent('evt-1')

    expect(result).toHaveLength(2)
    expect(result[0].styleName).toBe('Style A')
    expect(result[0].images).toHaveLength(1)
    expect(result[1].styleName).toBe('Style B')
    expect(result[1].images).toHaveLength(1)
    expect(mockFrom).toHaveBeenCalledWith('fabric_styles')
    expect(mockFrom).toHaveBeenCalledWith('fabric_images')
    expect(mockFrom).toHaveBeenCalledWith('price_history')
  })

  it('should return empty array when no styles found', async () => {
    const stylesChain = createMockSupabaseChain({ data: [], error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })
    const pricesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(stylesChain as any)
      .mockReturnValueOnce(imagesChain as any)
      .mockReturnValueOnce(pricesChain as any)

    const result = await repository.getStylesByEvent('evt-empty')
    expect(result).toEqual([])
  })

  it('should throw on database error', async () => {
    const chain = createMockSupabaseChain({
      data: null,
      error: { message: 'DB error' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(repository.getStylesByEvent('evt-1')).rejects.toEqual(
      expect.objectContaining({ message: 'DB error' })
    )
  })

  it('should handle styles without images', async () => {
    const styles = [makeStyleRow({ id: 's-1' })]
    const stylesChain = createMockSupabaseChain({ data: styles, error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(stylesChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.getStylesByEvent('evt-1')
    expect(result).toHaveLength(1)
    expect(result[0].images).toEqual([])
  })

  it('should group images to correct styles', async () => {
    const styles = [
      makeStyleRow({ id: 's-1' }),
      makeStyleRow({ id: 's-2' }),
    ]
    const images = [
      makeImageRow({ id: 'img-1', style_id: 's-1' }),
      makeImageRow({ id: 'img-2', style_id: 's-1' }),
      makeImageRow({ id: 'img-3', style_id: 's-2' }),
    ]

    const stylesChain = createMockSupabaseChain({ data: styles, error: null })
    const imagesChain = createMockSupabaseChain({ data: images, error: null })

    mockFrom
      .mockReturnValueOnce(stylesChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.getStylesByEvent('evt-1')

    expect(result[0].images).toHaveLength(2)
    expect(result[1].images).toHaveLength(1)
  })
})

describe('SupabaseStyleRepository.createStyle item_code validation (T3.4 regression)', () => {
  let repository: SupabaseStyleRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SupabaseStyleRepository()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } as any },
      error: null,
    })
  })

  const baseInput = {
    vendorId: 'v-1',
    styleName: 'Cotton Twill',
    composition: '100% Cotton',
    color: 'Navy',
    weight: '250gsm',
    width: '150cm',
    price: '12.50',
    supplierRef: '',
    notes: '',
    images: [],
  }

  // createStyle first looks up the vendor for event_id before validating item_code
  function mockVendorLookup() {
    const vendorChain = createMockSupabaseChain({ data: { event_id: 'evt-1' }, error: null })
    mockFrom.mockReturnValueOnce(vendorChain as any)
  }

  it('throws when sku is empty string (not silently stored as empty item_code)', async () => {
    mockVendorLookup()
    await expect(
      repository.createStyle({ ...baseInput, sku: '' })
    ).rejects.toThrow('item_code is required')
  })

  it('throws when sku is whitespace only', async () => {
    mockVendorLookup()
    await expect(
      repository.createStyle({ ...baseInput, sku: '   ' })
    ).rejects.toThrow('item_code is required')
  })
})

describe('getStyleDetail API function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch and return complete style detail', async () => {
    const { getStyleDetail } = await import('../getStyleDetail')

    const mockStyle = { id: 's-1', name: 'Test Style' }
    const mockVariants = [{ id: 'var-1', color_name: 'Navy' }]
    const mockInventory = [{ id: 'inv-1', quantity: 100 }]
    const mockPrices = [{ id: 'ph-1', price: 12.5 }]
    const mockImages = [{ id: 'img-1', public_url: 'https://example.com/img.jpg' }]

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      callCount++
      const chain: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
      }

      if (table === 'fabric_styles') {
        chain.single = vi.fn().mockResolvedValue({ data: mockStyle, error: null })
      } else if (table === 'fabric_variants') {
        // .order resolves via then
        chain.then = (resolve: any, reject: any) => {
          Promise.resolve({ data: mockVariants, error: null }).then(resolve, reject)
        }
      } else if (table === 'inventory_records') {
        chain.then = (resolve: any, reject: any) => {
          Promise.resolve({ data: mockInventory, error: null }).then(resolve, reject)
        }
      } else if (table === 'price_history') {
        chain.then = (resolve: any, reject: any) => {
          Promise.resolve({ data: mockPrices, error: null }).then(resolve, reject)
        }
      } else if (table === 'fabric_images') {
        chain.then = (resolve: any, reject: any) => {
          Promise.resolve({ data: mockImages, error: null }).then(resolve, reject)
        }
      }

      return chain
    })

    const result = await getStyleDetail('s-1')

    expect(result).not.toBeNull()
    expect(result!.style).toEqual(mockStyle)
    expect(result!.variants).toEqual(mockVariants)
    expect(result!.inventory).toEqual(mockInventory)
    expect(result!.prices).toEqual(mockPrices)
    expect(result!.images).toEqual(mockImages)
  })

  it('should return null when style not found', async () => {
    const { getStyleDetail } = await import('../getStyleDetail')

    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      }),
    }

    vi.mocked(supabase.from).mockReturnValue(chain)

    const result = await getStyleDetail('nonexistent')
    expect(result).toBeNull()
  })

  it('should throw on database error', async () => {
    const { getStyleDetail } = await import('../getStyleDetail')

    const chain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      }),
    }

    vi.mocked(supabase.from).mockReturnValue(chain)

    await expect(getStyleDetail('s-1')).rejects.toEqual(
      expect.objectContaining({ code: '42P01' })
    )
  })
})

describe('getVariant API function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return variant with latest inventory', async () => {
    const { getVariant } = await import('../updateVariant')

    const mockVariant = { id: 'var-1', style_id: 's-1', color_name: 'Navy' }
    const mockInventory = { id: 'inv-1', variant_id: 'var-1', quantity: 100 }

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call: fetch variant
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockVariant, error: null }),
        } as any
      }
      // Second call: fetch inventory
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockInventory, error: null }),
      } as any
    })

    const result = await getVariant('var-1')

    expect(result.variant.color_name).toBe('Navy')
    expect(result.inventory).not.toBeNull()
    expect(result.inventory!.quantity).toBe(100)
  })

  it('should return null inventory when no records exist', async () => {
    const { getVariant } = await import('../updateVariant')

    const mockVariant = { id: 'var-1', style_id: 's-1', color_name: 'Navy' }

    let callCount = 0
    vi.mocked(supabase.from).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockVariant, error: null }),
        } as any
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any
    })

    const result = await getVariant('var-1')
    expect(result.variant).toBeDefined()
    expect(result.inventory).toBeNull()
  })

  it('should throw on variant fetch error', async () => {
    const { getVariant } = await import('../updateVariant')

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Variant not found' },
      }),
    } as any)

    await expect(getVariant('nonexistent')).rejects.toEqual(
      expect.objectContaining({ message: 'Variant not found' })
    )
  })
})
