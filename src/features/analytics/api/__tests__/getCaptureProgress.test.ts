/**
 * Capture Progress API Tests
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
import { getCaptureProgress } from '../getCaptureProgress'

describe('getCaptureProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch capture progress for event', async () => {
    const mockVendors = [
      { id: 'v1', name: 'Vendor A', styles_committed_at: '2024-01-15T10:00:00Z' },
      { id: 'v2', name: 'Vendor B', styles_committed_at: null },
      { id: 'v3', name: 'Vendor C', styles_committed_at: '2024-01-15T11:00:00Z' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockVendors,
          error: null,
        } as never),
      }),
    } as any)

    const progress = await getCaptureProgress('event-123')

    expect(progress.total_vendors).toBe(3)
    expect(progress.captured_vendors).toBe(2)
    expect(progress.completion_percentage).toBe(67)
    expect(progress.remaining_vendors).toBe(1)
    expect(progress.captures_per_user).toEqual([])
    expect(progress.estimated_remaining_minutes).toBe(15) // 1 remaining * 15 min
  })

  it('should return zero progress when event has no vendors', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        } as never),
      }),
    } as any)

    const progress = await getCaptureProgress('event-123')

    expect(progress).toEqual({
      total_vendors: 0,
      captured_vendors: 0,
      completion_percentage: 0,
      remaining_vendors: 0,
      captures_per_user: [],
      estimated_remaining_minutes: null,
    })
  })

  it('should calculate 100% when all vendors captured', async () => {
    const mockVendors = [
      { id: 'v1', name: 'Vendor A', styles_committed_at: '2024-01-15T10:00:00Z' },
      { id: 'v2', name: 'Vendor B', styles_committed_at: '2024-01-15T11:00:00Z' },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockVendors,
          error: null,
        } as never),
      }),
    } as any)

    const progress = await getCaptureProgress('event-123')

    expect(progress.completion_percentage).toBe(100)
    expect(progress.remaining_vendors).toBe(0)
    expect(progress.estimated_remaining_minutes).toBe(null)
  })

  it('should estimate time remaining correctly', async () => {
    const mockVendors = [
      { id: 'v1', name: 'Vendor A', styles_committed_at: '2024-01-15T10:00:00Z' },
      // 9 more vendors not captured
      { id: 'v2', name: 'Vendor B', styles_committed_at: null },
      { id: 'v3', name: 'Vendor C', styles_committed_at: null },
      { id: 'v4', name: 'Vendor D', styles_committed_at: null },
      { id: 'v5', name: 'Vendor E', styles_committed_at: null },
      { id: 'v6', name: 'Vendor F', styles_committed_at: null },
      { id: 'v7', name: 'Vendor G', styles_committed_at: null },
      { id: 'v8', name: 'Vendor H', styles_committed_at: null },
      { id: 'v9', name: 'Vendor I', styles_committed_at: null },
      { id: 'v10', name: 'Vendor J', styles_committed_at: null },
    ]

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockVendors,
          error: null,
        } as never),
      }),
    } as any)

    const progress = await getCaptureProgress('event-123')

    // 9 remaining vendors * 15 minutes = 135 minutes
    expect(progress.estimated_remaining_minutes).toBe(135)
  })
})
