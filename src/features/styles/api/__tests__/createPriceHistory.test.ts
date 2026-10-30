import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { createPriceHistory } from '../createPriceHistory'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

// Mock auth
vi.mock('@/lib/supabase/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user-1'),
}))

describe('createPriceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create price history entry with correct fields', async () => {
    const mockRecord = {
      id: 'ph-1',
      currency: 'USD',
      price: 15.50,
      price_unit: 'meter',
    }

    const mockSingle = vi.fn().mockResolvedValue({ data: mockRecord, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    const result = await createPriceHistory({
      styleId: 's-1',
      eventId: 'evt-1',
      vendorId: 'v-1',
      currency: 'USD',
      price: 15.50,
      price_unit: 'meter',
    })

    expect(result.id).toBe('ph-1')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        style_id: 's-1',
        currency: 'USD',
        price: 15.50,
        price_unit: 'meter',
        recorded_by: 'user-1',
      })
    )
  })

  it('should include optional fields when provided', async () => {
    const mockRecord = { id: 'ph-2' }
    const mockSingle = vi.fn().mockResolvedValue({ data: mockRecord, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    await createPriceHistory({
      styleId: 's-1',
      eventId: 'evt-1',
      vendorId: 'v-1',
      variantId: 'var-1',
      currency: 'EUR',
      price: 12,
      price_unit: 'yard',
      minimum_order_quantity: 500,
      minimum_order_unit: 'meter',
      lead_time_value: 4,
      lead_time_unit: 'weeks',
      notes: 'Standard wholesale price',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        variant_id: 'var-1',
        minimum_order_quantity: 500,
        lead_time_value: 4,
        notes: 'Standard wholesale price',
      })
    )
  })

  it('should throw on error', async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    await expect(createPriceHistory({
      styleId: 's-1',
      eventId: 'evt-1',
      vendorId: 'v-1',
      currency: 'USD',
      price: 10,
      price_unit: 'meter',
    })).rejects.toEqual(
      expect.objectContaining({ message: 'Insert failed' })
    )
  })
})
