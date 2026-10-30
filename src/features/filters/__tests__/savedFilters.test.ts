/**
 * Saved Filters API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => {
  const mockChain: any = {
    select: vi.fn(function(this: any) { return mockChain }),
    insert: vi.fn(function(this: any) { return mockChain }),
    update: vi.fn(function(this: any) { return mockChain }),
    eq: vi.fn(function(this: any) { return mockChain }),
    is: vi.fn(function(this: any) { return mockChain }),
    order: vi.fn(function(this: any) { return mockChain }),
    single: vi.fn(function(this: any) { return mockChain }),
  }
  return {
    supabase: {
      from: vi.fn(function(this: any) { return mockChain }),
    },
  }
})

import { supabase } from '@/lib/supabase/client'
import {
  saveFilter,
  getSavedFilters,
  getFilterById,
  updateFilter,
  deleteFilter,
  reorderFilters,
} from '../api/savedFilters'
import type { SavedFilter } from '../types'

describe('savedFilters API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('saveFilter', () => {
    it('should insert a new filter', async () => {
      const mockFilter: SavedFilter = {
        id: 'filter-1',
        user_id: 'user-1',
        name: 'My Filter',
        description: 'Test filter',
        entity_type: 'vendors',
        filter_config: { category: ['clothing'] },
        is_shared: false,
        sort_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockFilter,
              error: null,
            } as never),
          }),
        }),
      } as any)

      const result = await saveFilter({
        name: 'My Filter',
        entity_type: 'vendors',
        filter_config: { category: ['clothing'] },
      })

      expect(result).toEqual(mockFilter)
      expect(supabase.from).toHaveBeenCalledWith('saved_filters')
    })

    it('should throw on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            } as never),
          }),
        }),
      } as any)

      await expect(
        saveFilter({
          name: 'My Filter',
          entity_type: 'vendors',
          filter_config: {},
        })
      ).rejects.toThrow('Failed to save filter: Insert failed')
    })
  })

  describe('getSavedFilters', () => {
    it('should fetch filters for entity type', async () => {
      const mockFilters: SavedFilter[] = [
        {
          id: 'filter-1',
          user_id: 'user-1',
          name: 'Filter 1',
          description: null,
          entity_type: 'vendors',
          filter_config: {},
          is_shared: false,
          sort_order: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
        },
      ]

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockFilters,
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: mockOrder,
            }),
          }),
        }),
      } as any)

      const result = await getSavedFilters('vendors')

      expect(result).toEqual(mockFilters)
    })

    it('should exclude shared filters when requested', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      const mockEq2 = vi.fn().mockReturnValue({
        order: mockOrder,
      })

      const mockIs = vi.fn().mockReturnValue({
        eq: mockEq2,
        order: mockOrder,
      })

      const mockEq1 = vi.fn().mockReturnValue({
        is: mockIs,
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: mockEq1,
        }),
      } as any)

      await getSavedFilters('vendors', false)

      expect(supabase.from).toHaveBeenCalledWith('saved_filters')
    })
  })

  describe('getFilterById', () => {
    it('should fetch a single filter by id', async () => {
      const mockFilter: SavedFilter = {
        id: 'filter-1',
        user_id: 'user-1',
        name: 'My Filter',
        description: null,
        entity_type: 'vendors',
        filter_config: {},
        is_shared: false,
        sort_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      }

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockFilter,
                error: null,
              } as never),
            }),
          }),
        }),
      } as any)

      const result = await getFilterById('filter-1')

      expect(result).toEqual(mockFilter)
    })

    it('should return null if not found', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              } as never),
            }),
          }),
        }),
      } as any)

      const result = await getFilterById('filter-1')

      expect(result).toBeNull()
    })
  })

  describe('updateFilter', () => {
    it('should update a filter', async () => {
      const mockFilter: SavedFilter = {
        id: 'filter-1',
        user_id: 'user-1',
        name: 'Updated Name',
        description: null,
        entity_type: 'vendors',
        filter_config: {},
        is_shared: false,
        sort_order: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        deleted_at: null,
      }

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockFilter,
                error: null,
              } as never),
            }),
          }),
        }),
      } as any)

      const result = await updateFilter('filter-1', { name: 'Updated Name' })

      expect(result).toEqual(mockFilter)
    })
  })

  describe('deleteFilter', () => {
    it('should soft delete a filter', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await deleteFilter('filter-1')

      expect(supabase.from).toHaveBeenCalledWith('saved_filters')
    })

    it('should throw on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      } as any)

      await expect(deleteFilter('filter-1')).rejects.toThrow(
        'Failed to delete filter: Delete failed'
      )
    })
  })

  describe('reorderFilters', () => {
    it('should update sort order for multiple filters', async () => {
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: mockEq,
        }),
      } as any)

      await reorderFilters(['filter-1', 'filter-2', 'filter-3'])

      expect(supabase.from).toHaveBeenCalledTimes(3)
    })
  })
})
