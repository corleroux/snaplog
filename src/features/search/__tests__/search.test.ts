/**
 * Search API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => {
  const mockChain: any = {
    select: vi.fn(function(this: any) { return mockChain }),
    insert: vi.fn(function(this: any) { return mockChain }),
    update: vi.fn(function(this: any) { return mockChain }),
    eq: vi.fn(function(this: any) { return mockChain }),
    order: vi.fn(function(this: any) { return mockChain }),
    limit: vi.fn(function(this: any) { return mockChain }),
    is: vi.fn(function(this: any) { return mockChain }),
    rpc: vi.fn(function(this: any) { return mockChain }),
  }
  return {
    supabase: {
      from: vi.fn(function(this: any) { return mockChain }),
      rpc: vi.fn(function(this: any) { return mockChain }),
    },
  }
})

import { supabase } from '@/lib/supabase/client'
import {
  globalSearch,
  saveSearchHistory,
  getRecentSearches,
  clearSearchHistory,
} from '../api/search'
import type { SearchResult } from '../api/search'

describe('search API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('globalSearch', () => {
    it('should call the global_search RPC function', async () => {
        const mockResults: SearchResult[] = [
          { type: 'vendor', id: '1', name: 'Test Vendor', snippet: 'Category', rank: 0.9, context_event_id: null, context_vendor_id: null },
        ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockResults,
        error: null,
      } as never)

      const result = await globalSearch('test')

      expect(result).toEqual(mockResults)
      expect(supabase.rpc).toHaveBeenCalledWith('global_search', {
        search_query: 'test',
        search_types: ['vendors', 'styles', 'events'],
        event_id: null,
      })
    })

    it('should filter by event ID when provided', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: [],
        error: null,
      } as never)

      await globalSearch('test', ['vendors'], 'event-123')

      expect(supabase.rpc).toHaveBeenCalledWith('global_search', {
        search_query: 'test',
        search_types: ['vendors'],
        event_id: 'event-123',
      })
    })

    it('should throw on error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Search failed' },
      } as never)

      await expect(globalSearch('test')).rejects.toThrow('Search failed')
    })
  })

  describe('saveSearchHistory', () => {
    it('should insert search history record', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: null,
        }),
      } as any)

      await saveSearchHistory('test query', 'vendor')

      expect(supabase.from).toHaveBeenCalledWith('search_history')
    })

    it('should silently fail on error', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          error: { message: 'Insert failed' },
        }),
      } as any)

      await expect(saveSearchHistory('test')).resolves.toBeUndefined()
      expect(consoleSpy).toHaveBeenCalledWith(
        '[search]',
        'Failed to save search history',
        { error: 'Insert failed' }
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getRecentSearches', () => {
    it('should fetch recent searches ordered by created_at', async () => {
      const mockSearches = [
        { id: '1', query: 'test1', result_type: 'vendor', created_at: '2024-01-01' },
        { id: '2', query: 'test2', result_type: 'style', created_at: '2024-01-02' },
      ]

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockSearches,
              error: null,
            }),
          }),
        }),
      } as any)

      const result = await getRecentSearches(10)

      expect(result).toEqual(mockSearches)
      expect(supabase.from).toHaveBeenCalledWith('search_history')
    })

    it('should return empty array on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Fetch failed' },
            }),
          }),
        }),
      } as any)

      const result = await getRecentSearches()

      expect(result).toEqual([])
    })
  })

  describe('clearSearchHistory', () => {
    it('should soft delete specific search by ID', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await clearSearchHistory('search-id-123')

      expect(supabase.from).toHaveBeenCalledWith('search_history')
    })

    it('should clear all history when no ID provided', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      await clearSearchHistory()

      expect(supabase.from).toHaveBeenCalledWith('search_history')
    })

    it('should throw on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      } as any)

      await expect(clearSearchHistory('id')).rejects.toThrow('Delete failed')
    })
  })
})
