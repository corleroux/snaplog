/**
 * Style Edit Flow Tests
 *
 * Tests the style and variant update paths:
 * - updateStyle API function
 * - updateVariant API function (with inventory append)
 * - getVariant API function
 * - addPriceHistory API function
 * - Mapper functions (styleRecordToFabricStyleRow, fabricStyleRowToStyleRecord, fabricImageToStyleImage)
 * - SupabaseStyleRepository.updateStyle
 * - SupabaseStyleRepository.deleteStyle (soft delete)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseChain } from '@/test/supabaseMocks'
import {
  SupabaseStyleRepository,
  fabricStyleRowToStyleRecord,
  fabricImageToStyleImage,
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

// Mock auth
vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user-1'),
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
  finish: 'Brushed',
  pattern: 'Solid',
  width_cm: 150,
  width_in: 59,
  weight_gsm: 250,
  weight_ozsy: 7.4,
  season: 'SS25',
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

describe('fabricStyleRowToStyleRecord', () => {
  it('should map persistence row to app-facing StyleRecord', () => {
    const row = makeStyleRow()
    const images = [makeImageRow()]

    const record = fabricStyleRowToStyleRecord(row, images)

    expect(record.id).toBe('s-1')
    expect(record.vendorId).toBe('v-1')
    expect(record.styleName).toBe('Cotton Twill')
    expect(record.composition).toBe('100% Cotton')
    expect(record.sku).toBe('FAB-001')
    expect(record.images).toHaveLength(1)
    expect(record.images[0].uri).toBe('https://example.com/img.jpg')
  })

  it('should handle null optional fields', () => {
    const row = makeStyleRow({
      name: null,
      composition: null,
      item_code: null,
      weight_gsm: null,
      weight_ozsy: null,
      width_cm: null,
      width_in: null,
    })

    const record = fabricStyleRowToStyleRecord(row)

    expect(record.styleName).toBe('')
    expect(record.composition).toBe('')
    expect(record.sku).toBe('')
    expect(record.weight).toBe('')
    expect(record.width).toBe('')
    expect(record.images).toEqual([])
  })

  it('should format weight from gsm', () => {
    const row = makeStyleRow({ weight_gsm: 250, weight_ozsy: null })
    const record = fabricStyleRowToStyleRecord(row)
    expect(record.weight).toBe('250 GSM')
  })

  it('should format weight from ozsy when gsm is null', () => {
    const row = makeStyleRow({ weight_gsm: null, weight_ozsy: 7.4 })
    const record = fabricStyleRowToStyleRecord(row)
    expect(record.weight).toBe('7.4 oz/yd²')
  })

  it('should format width from cm', () => {
    const row = makeStyleRow({ width_cm: 150, width_in: null })
    const record = fabricStyleRowToStyleRecord(row)
    expect(record.width).toBe('150 cm')
  })

  it('should format width from inches when cm is null', () => {
    const row = makeStyleRow({ width_cm: null, width_in: 59 })
    const record = fabricStyleRowToStyleRecord(row)
    expect(record.width).toBe('59 in')
  })

  it('should extract extraction metadata when present', () => {
    const row = makeStyleRow({
      extracted_at: '2025-01-01T00:00:00Z',
      extraction_warnings: ['Low confidence on weight'],
    })

    const record = fabricStyleRowToStyleRecord(row)
    expect(record.extractionMeta).toBeDefined()
    expect(record.extractionMeta!.extractedAt).toBe('2025-01-01T00:00:00Z')
    expect(record.extractionMeta!.warnings).toEqual(['Low confidence on weight'])
  })

  it('should not set extractionMeta when no extraction data', () => {
    const row = makeStyleRow({
      extracted_at: null,
      extraction_warnings: null,
    })

    const record = fabricStyleRowToStyleRecord(row)
    expect(record.extractionMeta).toBeUndefined()
  })
})

describe('fabricImageToStyleImage', () => {
  it('should map fabric_images row to StyleImageRecord', () => {
    const row = makeImageRow({
      public_url: 'https://example.com/img.jpg',
      caption: 'Swatch photo',
    })

    const record = fabricImageToStyleImage(row)

    expect(record.id).toBe('img-1')
    expect(record.uri).toBe('https://example.com/img.jpg')
    expect(record.caption).toBe('Swatch photo')
  })

  it('should generate public URL from storage_path when public_url is null', () => {
    const row = makeImageRow({
      public_url: null,
      storage_path: 'fabrics/img.jpg',
    })

    const record = fabricImageToStyleImage(row)
    expect(record.uri).toContain('/object/public/scan-originals/fabrics/img.jpg')
  })

  it('should set caption to undefined when null', () => {
    const row = makeImageRow({ caption: null })
    const record = fabricImageToStyleImage(row)
    expect(record.caption).toBeUndefined()
  })
})

describe('SupabaseStyleRepository.getStyle', () => {
  let repository: SupabaseStyleRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SupabaseStyleRepository()
  })

  it('should return style with images when found', async () => {
    const styleRow = makeStyleRow()
    const images = [makeImageRow()]

    const styleChain = createMockSupabaseChain({ data: styleRow, error: null })
    const imagesChain = createMockSupabaseChain({ data: images, error: null })

    mockFrom
      .mockReturnValueOnce(styleChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.getStyle('s-1')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('s-1')
    expect(result!.styleName).toBe('Cotton Twill')
    expect(result!.images).toHaveLength(1)
    expect(mockFrom).toHaveBeenCalledWith('fabric_styles')
    expect(mockFrom).toHaveBeenCalledWith('fabric_images')
  })

  it('should return null when style not found', async () => {
    const chain = createMockSupabaseChain({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    })
    mockFrom.mockReturnValue(chain as any)

    const result = await repository.getStyle('nonexistent')
    expect(result).toBeNull()
  })

  it('should throw on database error', async () => {
    const chain = createMockSupabaseChain({
      data: null,
      error: { code: '42P01', message: 'relation does not exist' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(repository.getStyle('s-1')).rejects.toEqual(
      expect.objectContaining({ code: '42P01' })
    )
  })
})

describe('SupabaseStyleRepository.getStylesByVendor', () => {
  let repository: SupabaseStyleRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SupabaseStyleRepository()
  })

  it('should return styles for correct vendor with images', async () => {
    const styles = [
      makeStyleRow({ id: 's-1', name: 'Style A' }),
      makeStyleRow({ id: 's-2', name: 'Style B' }),
    ]
    const images = [
      makeImageRow({ style_id: 's-1', is_primary: true }),
      makeImageRow({ style_id: 's-2', is_primary: false }),
    ]

    const stylesChain = createMockSupabaseChain({ data: styles, error: null })
    const imagesChain = createMockSupabaseChain({ data: images, error: null })

    mockFrom
      .mockReturnValueOnce(stylesChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.getStylesByVendor('v-1')

    expect(result).toHaveLength(2)
    expect(result[0].styleName).toBe('Style A')
    expect(result[0].images).toHaveLength(1)
    expect(result[1].styleName).toBe('Style B')
  })

  it('should return empty array when no styles found', async () => {
    const stylesChain = createMockSupabaseChain({ data: [], error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(stylesChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.getStylesByVendor('v-empty')
    expect(result).toEqual([])
  })

  it('should throw on database error', async () => {
    const chain = createMockSupabaseChain({
      data: null,
      error: { message: 'DB error' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(repository.getStylesByVendor('v-1')).rejects.toEqual(
      expect.objectContaining({ message: 'DB error' })
    )
  })
})

describe('SupabaseStyleRepository.updateStyle', () => {
  let repository: SupabaseStyleRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SupabaseStyleRepository()
  })

  const mockStyleRow = makeStyleRow({
    name: 'Updated Twill',
    composition: '50/50 Cotton Poly',
  })

  it('should update only provided fields', async () => {
    const updateChain = createMockSupabaseChain({ error: null })
    const getChain = createMockSupabaseChain({ data: mockStyleRow, error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(updateChain as any)
      .mockReturnValueOnce(getChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.updateStyle('s-1', {
      styleName: 'Updated Twill',
      composition: '50/50 Cotton Poly',
    })

    expect(result.styleName).toBe('Updated Twill')
    expect(result.composition).toBe('50/50 Cotton Poly')
    expect(mockFrom).toHaveBeenCalledWith('fabric_styles')
  })

  it('should handle empty update input', async () => {
    const updateChain = createMockSupabaseChain({ error: null })
    const getChain = createMockSupabaseChain({ data: mockStyleRow, error: null })
    const imagesChain = createMockSupabaseChain({ data: [], error: null })

    mockFrom
      .mockReturnValueOnce(updateChain as any)
      .mockReturnValueOnce(getChain as any)
      .mockReturnValueOnce(imagesChain as any)

    const result = await repository.updateStyle('s-1', {})
    expect(result).toBeDefined()
  })

  it('should throw on update error', async () => {
    const chain = createMockSupabaseChain({
      error: { message: 'Update failed' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(
      repository.updateStyle('s-1', { styleName: 'X' })
    ).rejects.toEqual(expect.objectContaining({ message: 'Update failed' }))
  })
})

describe('SupabaseStyleRepository.deleteStyle', () => {
  let repository: SupabaseStyleRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SupabaseStyleRepository()
  })

  it('should soft-delete by setting status to archived', async () => {
    const deleteChain = createMockSupabaseChain({ error: null })
    mockFrom.mockReturnValueOnce(deleteChain as any)

    await repository.deleteStyle('s-1')

    expect(mockFrom).toHaveBeenCalledWith('fabric_styles')
    expect(deleteChain.update).toHaveBeenCalledWith(expect.objectContaining({ 
      status: 'archived',
      deleted_at: expect.any(String)
    }))
  })

  it('should throw on delete error', async () => {
    const chain = createMockSupabaseChain({
      error: { message: 'Delete failed' },
    })
    mockFrom.mockReturnValue(chain as any)

    await expect(repository.deleteStyle('s-1')).rejects.toEqual(
      expect.objectContaining({ message: 'Delete failed' })
    )
  })
})

describe('updateStyle API function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call supabase update with correct fields', async () => {
    const { updateStyle } = await import('../updateStyle')

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: { id: 's-1', name: 'Updated' },
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

    await updateStyle('s-1', {
      name: 'Updated Style',
      composition: '100% Linen',
    }, 1)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Updated Style',
        composition: '100% Linen',
      })
    )
  })
})

describe('updateVariant API function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update variant and create inventory record', async () => {
    const { updateVariant } = await import('../updateVariant')

    const variantData = {
      id: 'var-1',
      style_id: 's-1',
      event_id: 'evt-1',
      vendor_id: 'v-1',
      color_name: 'Navy',
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({ data: variantData, error: null })
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'fabric_variants') {
        return { update: mockUpdate } as any
      }
      if (table === 'inventory_records') {
        return { insert: mockInsert } as any
      }
      return {} as any
    })

    const result = await updateVariant('var-1', {
      variantFields: { color_name: 'Navy' },
      inventoryFields: { quantity: 100, unit: 'meters' },
    }, 1)

    expect(result.color_name).toBe('Navy')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        variant_id: 'var-1',
        quantity: 100,
        unit: 'meters',
      })
    )
  })

  it('should succeed even when inventory creation fails', async () => {
    const { updateVariant } = await import('../updateVariant')

    const variantData = {
      id: 'var-1',
      style_id: 's-1',
      event_id: 'evt-1',
      vendor_id: 'v-1',
      color_name: 'Navy',
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({ data: variantData, error: null })
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    })
    const mockInsert = vi.fn().mockResolvedValue({
      error: { message: 'Inventory insert failed' },
    })

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'fabric_variants') {
        return { update: mockUpdate } as any
      }
      if (table === 'inventory_records') {
        return { insert: mockInsert } as any
      }
      return {} as any
    })

    // Should NOT throw - inventory errors are non-fatal
    const result = await updateVariant('var-1', {
      variantFields: { color_name: 'Navy' },
      inventoryFields: { quantity: 100, unit: 'meters' },
    }, 1)

    expect(result.color_name).toBe('Navy')
  })

  it('should throw on variant update error', async () => {
    const { updateVariant } = await import('../updateVariant')

    const mockEq = vi.fn().mockReturnThis()
    const mockSelect = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Variant not found' },
    })
    const mockUpdate = vi.fn().mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    })

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as any)

    await expect(
      updateVariant('nonexistent', {
        variantFields: { color_name: 'Navy' },
      }, 1)
    ).rejects.toEqual(expect.objectContaining({ message: 'Variant not found' }))
  })
})

describe('addPriceHistory API function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create price history entry with recorded_by', async () => {
    const { addPriceHistory } = await import('../addPriceHistory')

    const mockPriceData = {
      id: 'ph-1',
      style_id: 's-1',
      event_id: 'evt-1',
      vendor_id: 'v-1',
      currency: 'USD',
      price: 12.5,
      price_unit: 'per_meter',
      recorded_by: 'user-1',
    }

    const mockSelect = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({ data: mockPriceData, error: null })
    const mockInsert = vi.fn().mockReturnValue({
      select: mockSelect,
      single: mockSingle,
    })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    const result = await addPriceHistory({
      style_id: 's-1',
      event_id: 'evt-1',
      vendor_id: 'v-1',
      currency: 'USD',
      price: 12.5,
      price_unit: 'per_meter',
    })

    expect(result.price).toBe(12.5)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'USD',
        price: 12.5,
        recorded_by: 'user-1',
      })
    )
  })

  it('should throw on insert error', async () => {
    const { addPriceHistory } = await import('../addPriceHistory')

    const mockSelect = vi.fn().mockReturnThis()
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    })
    const mockInsert = vi.fn().mockReturnValue({
      select: mockSelect,
      single: mockSingle,
    })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    await expect(
      addPriceHistory({
        style_id: 's-1',
        event_id: 'evt-1',
        vendor_id: 'v-1',
        currency: 'USD',
        price: 12.5,
        price_unit: 'per_meter',
      })
    ).rejects.toEqual(expect.objectContaining({ message: 'Insert failed' }))
  })
})
