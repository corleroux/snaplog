/**
 * Event Stats API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client - define inline to avoid hoisting issues
vi.mock('@/lib/supabase/client', () => {
  const createChain = (result: any) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        then: (resolve: any) => result.then(resolve),
        gte: vi.fn(() => ({
          then: (resolve: any) => result.then(resolve),
        })),
      })),
      in: vi.fn(() => ({
        then: (resolve: any) => result.then(resolve),
      })),
    })),
  })

  const createChainWithData = (result: any) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => result),
    })),
  })

  return {
    supabase: {
      from: vi.fn((table: string) => {
        // Return different mocks based on table and call sequence
        if (table === 'vendors') {
          // For vendors list query
          return createChainWithData(
            Promise.resolve({
              data: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }],
              error: null,
            })
          )
        }
        return createChain(Promise.resolve({ data: null, count: 0, error: null }))
      }),
    },
  }
})

import { supabase } from '@/lib/supabase/client'
import { getEventStats } from '../getEventStats'

describe('getEventStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch event statistics', async () => {
    let fromCallIndex = 0

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const index = fromCallIndex++

      // 1. Vendors count
      if (table === 'vendors' && index === 0) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, count: 15, error: null })),
          })),
        } as any
      }

      // 2. Styles count
      if (table === 'fabric_styles' && index === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, count: 42, error: null })),
          })),
        } as any
      }

      // 3. Vendors list (for images)
      if (table === 'vendors' && index === 2) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() =>
              Promise.resolve({
                data: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }],
                error: null,
              })
            ),
          })),
        } as any
      }

      // 4. Images count
      if (table === 'fabric_images' && index === 3) {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() =>
              Promise.resolve({ data: null, count: 128, error: null })
            ),
          })),
        } as any
      }

      // 5. Completed vendors
      if (table === 'vendors' && index === 4) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() =>
                Promise.resolve({ data: null, count: 12, error: null })
              ),
            })),
          })),
        } as any
      }

      // Default fallback
      return {
        select: vi.fn(),
      } as any
    })

    const stats = await getEventStats('event-123')

    expect(stats).toMatchObject({
      totalVendors: 15,
      totalStyles: 42,
      totalImages: 128,
      completedVendors: 12,
    })
  })

  it('should return zeros when event has no data', async () => {
    const emptyResult = Promise.resolve({ data: null, count: 0, error: null })

    let fromCallIndex = 0

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      fromCallIndex++

      if (table === 'vendors') {
        // Vendors count or list
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              then: (resolve: any) => emptyResult.then(resolve),
              gte: vi.fn(() => ({
                then: (resolve: any) => emptyResult.then(resolve),
              })),
            })),
          })),
        } as any
      }

      if (table === 'fabric_styles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => emptyResult),
          })),
        } as any
      }

      if (table === 'fabric_images') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => emptyResult),
          })),
        } as any
      }

      return { select: vi.fn() } as any
    })

    const stats = await getEventStats('event-123')

    expect(stats).toEqual({
      totalVendors: 0,
      totalStyles: 0,
      totalImages: 0,
      completedVendors: 0,
    })
  })

  it('should throw on database error', async () => {
    const errorResult = Promise.resolve({
      data: null,
      count: null,
      error: { message: 'Database error' },
    })

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => errorResult),
      })),
    } as any)

    await expect(getEventStats('event-123')).rejects.toThrow()
  })
})
