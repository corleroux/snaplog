/**
 * Batch Update Vendors API Tests
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
  batchArchiveVendors,
  batchUpdateVendorCategory,
  batchTagVendors,
  batchExportVendors,
} from '../api/batchUpdateVendors'

describe('batchUpdateVendors API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('batchArchiveVendors', () => {
    it('should soft delete multiple vendors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await batchArchiveVendors({ vendorIds: ['v1', 'v2', 'v3'] })

      expect(supabase.from).toHaveBeenCalledWith('vendors')
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
        batchArchiveVendors({ vendorIds: ['v1'] })
      ).rejects.toThrow('Failed to archive vendors: Archive failed')
    })
  })

  describe('batchUpdateVendorCategory', () => {
    it('should update category for multiple vendors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await batchUpdateVendorCategory({
        vendorIds: ['v1', 'v2'],
        category: 'clothing',
      })

      expect(supabase.from).toHaveBeenCalledWith('vendors')
    })
  })

  describe('batchTagVendors', () => {
    it('should add tags to multiple vendors', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await batchTagVendors({
        vendorIds: ['v1'],
        tags: ['tag1', 'tag2'],
      })

      expect(supabase.from).toHaveBeenCalledWith('vendors')
    })
  })

  describe('batchExportVendors', () => {
    it('should export vendors to CSV', async () => {
      const mockVendors = [
        {
          id: 'v1',
          name: 'Vendor 1',
          category: 'clothing',
          contact_name: 'John',
          email: 'john@example.com',
          phone: '555-1234',
          booth_number: 'A1',
          notes: 'Test notes',
        },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: mockVendors,
            error: null,
          }),
        }),
      } as any)

      const csv = await batchExportVendors({ vendorIds: ['v1'] })

      expect(csv).toContain('"ID","Name","Category"')
      expect(csv).toContain('"Vendor 1"')
    })
  })
})
