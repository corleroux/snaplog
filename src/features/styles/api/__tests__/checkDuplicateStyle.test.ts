import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { checkDuplicateStyle } from '../checkDuplicateStyle'

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('checkDuplicateStyle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return isDuplicate: false when no item code provided', async () => {
    const result = await checkDuplicateStyle({
      itemCode: '',
      vendorId: 'v-1',
    })

    expect(result.isDuplicate).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('should return isDuplicate: true when matching style exists', async () => {
    const mockStyle = { id: 'fs-1', item_code: 'SKU-1', vendor_id: 'v-1' }
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockStyle, error: null })
    
    // Create a chainable mock object
    const mockQuery: any = {
      eq: vi.fn(),
      neq: vi.fn(),
      maybeSingle: mockMaybeSingle,
    }
    mockQuery.eq.mockReturnValue(mockQuery)
    mockQuery.neq.mockReturnValue(mockQuery)

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    } as any)

    const result = await checkDuplicateStyle({
      itemCode: 'SKU-1',
      vendorId: 'v-1',
    })

    expect(result.isDuplicate).toBe(true)
    expect(result.existingStyle).toEqual(mockStyle)
    expect(mockQuery.eq).toHaveBeenCalledWith('item_code', 'SKU-1')
    expect(mockQuery.eq).toHaveBeenCalledWith('vendor_id', 'v-1')
  })

  it('should return isDuplicate: false when no matching style exists', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    
    const mockQuery: any = {
      eq: vi.fn(),
      neq: vi.fn(),
      maybeSingle: mockMaybeSingle,
    }
    mockQuery.eq.mockReturnValue(mockQuery)
    mockQuery.neq.mockReturnValue(mockQuery)

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    } as any)

    const result = await checkDuplicateStyle({
      itemCode: 'SKU-NEW',
      vendorId: 'v-1',
    })

    expect(result.isDuplicate).toBe(false)
    expect(result.existingStyle).toBeNull()
  })

  it('should exclude specified style ID', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    
    const mockQuery: any = {
      eq: vi.fn(),
      neq: vi.fn(),
      maybeSingle: mockMaybeSingle,
    }
    mockQuery.eq.mockReturnValue(mockQuery)
    mockQuery.neq.mockReturnValue(mockQuery)

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    } as any)

    await checkDuplicateStyle({
      itemCode: 'SKU-1',
      vendorId: 'v-1',
      excludeStyleId: 'fs-current',
    })

    expect(mockQuery.neq).toHaveBeenCalledWith('id', 'fs-current')
  })

  it('should return false gracefully on Supabase error', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'DB Error' } })
    
    const mockQuery: any = {
      eq: vi.fn(),
      neq: vi.fn(),
      maybeSingle: mockMaybeSingle,
    }
    mockQuery.eq.mockReturnValue(mockQuery)
    mockQuery.neq.mockReturnValue(mockQuery)

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    } as any)

    const result = await checkDuplicateStyle({
      itemCode: 'SKU-1',
      vendorId: 'v-1',
    })

    expect(result.isDuplicate).toBe(false)
  })
})
