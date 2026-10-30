/**
 * Vendor Attendance API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  }
})

import { supabase } from '@/lib/supabase/client'
import { getVendorAttendance } from '../getVendorAttendance'

describe('getVendorAttendance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch vendor attendance list', async () => {
    const mockVendors = [
      {
        id: 'v1',
        name: 'Vendor A',
        category: 'Textiles',
        booth_number: 'A101',
        styles_committed_at: '2024-01-15T10:00:00Z',
        fabric_styles: [{ id: 's1' }],
      },
      {
        id: 'v2',
        name: 'Vendor B',
        category: 'Leather',
        booth_number: 'B205',
        styles_committed_at: null,
        fabric_styles: [],
      },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockVendors,
          error: null,
        } as never),
      }),
    } as any)

    const attendance = await getVendorAttendance('event-123')

    expect(attendance).toEqual({
      captured: [
        {
          id: 'v1',
          name: 'Vendor A',
          category: 'Textiles',
          booth_number: 'A101',
          styles_count: 1,
        },
      ],
      not_captured: [
        {
          id: 'v2',
          name: 'Vendor B',
          category: 'Leather',
          booth_number: 'B205',
          styles_count: 0,
        },
      ],
      total: 2,
      captured_count: 1,
    })
  })

  it('should filter by category', async () => {
    const mockVendors = [
      {
        id: 'v1',
        name: 'Vendor A',
        category: 'Textiles',
        booth_number: 'A101',
        styles_committed_at: '2024-01-15T10:00:00Z',
        fabric_styles: [{ id: 's1' }],
      },
      {
        id: 'v2',
        name: 'Vendor B',
        category: 'Leather',
        booth_number: 'B205',
        styles_committed_at: null,
        fabric_styles: [],
      },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [mockVendors[0]],
            error: null,
          } as never),
        }),
      }),
    } as any)

    const attendance = await getVendorAttendance('event-123', { category: 'Textiles' })

    expect(attendance.total).toBe(1)
    expect(attendance.captured[0].category).toBe('Textiles')
  })

  it('should return empty arrays when event has no vendors', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        } as never),
      }),
    } as any)

    const attendance = await getVendorAttendance('event-123')

    expect(attendance).toEqual({
      captured: [],
      not_captured: [],
      total: 0,
      captured_count: 0,
    })
  })
})
