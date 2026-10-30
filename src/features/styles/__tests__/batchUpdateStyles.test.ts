/**
 * Batch Update Styles API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => {
  const mockChain: any = {
    update: vi.fn(function(this: any) { return mockChain }),
    in: vi.fn(function(this: any) { return mockChain }),
    select: vi.fn(function(this: any) { return mockChain }),
  }
  return {
    supabase: {
      from: vi.fn(function(this: any) { return mockChain }),
    },
  }
})

import { supabase } from '@/lib/supabase/client'
import {
  batchArchiveStyles,
  batchUpdateStyleSeason,
  batchUpdateStyleStatus,
  batchExportStyles,
} from '../api/batchUpdateStyles'

describe('batchUpdateStyles API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('batchArchiveStyles', () => {
    it('should soft delete multiple styles', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await batchArchiveStyles({ styleIds: ['s1', 's2', 's3'] })

      expect(supabase.from).toHaveBeenCalledWith('fabric_styles')
    })

    it('should throw on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            error: { message: 'Archive failed' },
          }),
        }),
      } as any)

      await expect(
        batchArchiveStyles({ styleIds: ['s1'] })
      ).rejects.toThrow('Failed to archive styles: Archive failed')
    })
  })

  describe('batchUpdateStyleSeason', () => {
    it('should update season for multiple styles', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await batchUpdateStyleSeason({
        styleIds: ['s1', 's2'],
        season: 'SS25',
      })

      expect(supabase.from).toHaveBeenCalledWith('fabric_styles')
    })
  })

  describe('batchUpdateStyleStatus', () => {
    it('should update status for multiple styles', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await batchUpdateStyleStatus({
        styleIds: ['s1', 's2'],
        status: 'committed',
      })

      expect(supabase.from).toHaveBeenCalledWith('fabric_styles')
    })
  })

    describe('batchExportStyles', () => {
    it('should export styles to CSV', async () => {
      const mockStyles = [
        {
          id: 's1',
          name: 'Style 1',
          category: 'dress',
          season: 'SS25',
          status: 'committed',
          description: 'Test style',
          vendor: { name: 'Vendor 1' },
        },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockStyles,
            error: null,
          }),
        }),
      } as any)

      const csv = await batchExportStyles({ styleIds: ['s1'] })

      expect(csv).toContain('"ID","Name","Category"')
      expect(csv).toContain('"Style 1"')
    })
  })
})
