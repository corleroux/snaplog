import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { createInventoryRecord } from '../createInventoryRecord'

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

describe('createInventoryRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create inventory record with correct fields', async () => {
    const mockRecord = {
      id: 'inv-1',
      quantity: 100,
      unit: 'meters',
      stock_status: 'in_stock',
    }

    const mockSingle = vi.fn().mockResolvedValue({ data: mockRecord, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    const result = await createInventoryRecord({
      styleId: 's-1',
      eventId: 'evt-1',
      vendorId: 'v-1',
      quantity: 100,
      unit: 'meters',
    })

    expect(result.id).toBe('inv-1')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        style_id: 's-1',
        quantity: 100,
        unit: 'meters',
        stock_status: 'in_stock',
        created_by: 'user-1',
      })
    )
  })

  it('should include optional fields when provided', async () => {
    const mockRecord = { id: 'inv-2' }
    const mockSingle = vi.fn().mockResolvedValue({ data: mockRecord, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any)

    await createInventoryRecord({
      styleId: 's-1',
      eventId: 'evt-1',
      vendorId: 'v-1',
      variantId: 'var-1',
      quantity: 50,
      unit: 'rolls',
      batchNo: 'B-001',
      stockStatus: 'low_stock',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        variant_id: 'var-1',
        batch_no: 'B-001',
        stock_status: 'low_stock',
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

    await expect(createInventoryRecord({
      styleId: 's-1',
      eventId: 'evt-1',
      vendorId: 'v-1',
      quantity: 100,
      unit: 'meters',
    })).rejects.toEqual(
      expect.objectContaining({ message: 'Insert failed' })
    )
  })
})
