import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase/client'
import { archiveVariant } from '../archiveVariant'
import { batchUpdateVariants } from '../batchUpdateVariants'

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

describe('Variant Archiving APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('archiveVariant', () => {
    it('should update status to discontinued and set updated_by', async () => {
      const variantData = {
        id: 'var-1',
        status: 'discontinued',
        updated_by: 'user-1',
      }

      const mockSingle = vi.fn().mockResolvedValue({ data: variantData, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any)

      const result = await archiveVariant('var-1')

      expect(result.status).toBe('discontinued')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'discontinued',
          updated_by: 'user-1',
        })
      )
      expect(mockEq).toHaveBeenCalledWith('id', 'var-1')
    })

    it('should throw on error', async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any)

      await expect(archiveVariant('var-1')).rejects.toEqual(
        expect.objectContaining({ message: 'Update failed' })
      )
    })
  })

  describe('batchUpdateVariants', () => {
    it('should update multiple variants and return count', async () => {
      const mockIn = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }], error: null }),
      })
      const mockUpdate = vi.fn().mockReturnValue({ in: mockIn })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any)

      const count = await batchUpdateVariants(['v1', 'v2', 'v3'], 'discontinued')

      expect(count).toBe(3)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'discontinued',
          updated_by: 'user-1',
        })
      )
      expect(mockIn).toHaveBeenCalledWith('id', ['v1', 'v2', 'v3'])
    })

    it('should return 0 if no IDs provided', async () => {
      const count = await batchUpdateVariants([], 'discontinued')
      expect(count).toBe(0)
      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should throw on error', async () => {
      const mockIn = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ count: null, error: { message: 'Batch failed' } }),
      })
      const mockUpdate = vi.fn().mockReturnValue({ in: mockIn })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any)

      await expect(batchUpdateVariants(['v1'], 'active')).rejects.toEqual(
        expect.objectContaining({ message: 'Batch failed' })
      )
    })
  })
})
