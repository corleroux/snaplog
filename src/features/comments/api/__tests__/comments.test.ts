/**
 * Comments API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getEntityComments,
  getCommentReplies,
  createComment,
  updateComment,
  deleteComment,
  subscribeToEntityComments
} from '../comments'

// Mock supabase client - must be self-contained in factory
vi.mock('@/lib/supabase/client', () => {
  const mockRpc = vi.fn()
  const mockFrom = vi.fn()
  const mockChannel = vi.fn(() => ({
    on: vi.fn(() => ({ subscribe: vi.fn() }))
  }))
  const mockRemoveChannel = vi.fn()
  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@example.com', user_metadata: { full_name: 'Test User' } } }
  })

  return {
    supabase: {
      rpc: mockRpc,
      from: mockFrom,
      channel: mockChannel,
      removeChannel: mockRemoveChannel,
      auth: {
        getUser: mockGetUser
      }
    }
  }
})

// Import after mock to get the mocked version
import { supabase } from '@/lib/supabase/client'

describe('Comments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEntityComments', () => {
    it('should fetch comments for an entity', async () => {
      const mockComments = [
        {
          id: '1',
          entity_type: 'vendor',
          entity_id: 'vendor-1',
          parent_id: null,
          content: 'Test comment',
          user_id: 'user-1',
          user_email: 'test@example.com',
          user_full_name: 'Test User',
          mentioned_users: [],
          created_at: '2025-04-14T00:00:00Z',
          updated_at: '2025-04-14T00:00:00Z',
          deleted_at: null,
          reply_count: 2
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockComments,
        error: null
      } as any)

      const result = await getEntityComments('vendor', 'vendor-1')

      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Test comment')
      expect(result[0].replyCount).toBe(2)
    })

    it('should handle empty results', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: [],
        error: null
      } as any)

      const result = await getEntityComments('vendor', 'vendor-1')

      expect(result).toHaveLength(0)
    })
  })

  describe('getCommentReplies', () => {
    it('should fetch replies for a comment', async () => {
      const mockReplies = [
        {
          id: '2',
          entity_type: 'vendor',
          entity_id: 'vendor-1',
          parent_id: '1',
          content: 'Test reply',
          user_id: 'user-2',
          user_email: 'reply@example.com',
          user_full_name: 'Reply User',
          mentioned_users: [],
          created_at: '2025-04-14T00:00:00Z',
          updated_at: '2025-04-14T00:00:00Z',
          deleted_at: null
        }
      ]

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockReplies,
        error: null
      } as any)

      const result = await getCommentReplies('1')

      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('Test reply')
      expect(result[0].parentId).toBe('1')
    })
  })

  describe('createComment', () => {
    it('should create a new comment', async () => {
      const mockNewComment = {
        id: 'new-1',
        entity_type: 'vendor',
        entity_id: 'vendor-1',
        parent_id: null,
        content: 'New comment',
        user_id: 'user-1',
        mentioned_users: [],
        created_at: '2025-04-14T00:00:00Z',
        updated_at: '2025-04-14T00:00:00Z',
        deleted_at: null
      }

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockNewComment,
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await createComment('vendor', 'vendor-1', 'New comment')

      expect(result.content).toBe('New comment')
      expect(result.user.email).toBe('test@example.com')
    })

    it('should create a reply comment', async () => {
      const mockNewReply = {
        id: 'reply-1',
        entity_type: 'vendor',
        entity_id: 'vendor-1',
        parent_id: 'comment-1',
        content: 'New reply',
        user_id: 'user-1',
        mentioned_users: [],
        created_at: '2025-04-14T00:00:00Z',
        updated_at: '2025-04-14T00:00:00Z',
        deleted_at: null
      }

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockNewReply,
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: mockSelect
      })

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert
      } as any)

      const result = await createComment('vendor', 'vendor-1', 'New reply', 'comment-1')

      expect(result.content).toBe('New reply')
      expect(result.parentId).toBe('comment-1')
    })
  })

  describe('updateComment', () => {
    it('should update an existing comment', async () => {
      const mockUpdatedComment = {
        id: '1',
        entity_type: 'vendor',
        entity_id: 'vendor-1',
        parent_id: null,
        content: 'Updated content',
        user_id: 'user-1',
        mentioned_users: [],
        created_at: '2025-04-14T00:00:00Z',
        updated_at: '2025-04-14T01:00:00Z',
        deleted_at: null
      }

      const mockSingle = vi.fn().mockResolvedValueOnce({
        data: mockUpdatedComment,
        error: null
      })

      const mockEq = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ single: mockSingle })
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate
      } as any)

      const result = await updateComment('1', 'Updated content')

      expect(result.content).toBe('Updated content')
      expect(mockUpdate).toHaveBeenCalledWith({ content: 'Updated content' })
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })
  })

  describe('deleteComment', () => {
    it('should soft delete a comment', async () => {
      const mockEq = vi.fn().mockResolvedValueOnce({
        error: null
      })

      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockEq
      })

      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate
      } as any)

      await deleteComment('1')

      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })
  })

  describe('subscribeToEntityComments', () => {
    it('should subscribe to comment changes', () => {
      const mockOn = vi.fn().mockReturnValue({
        subscribe: vi.fn()
      })

      vi.mocked(supabase.channel).mockReturnValue({
        on: mockOn
      } as any)

      const callback = vi.fn()
      const unsubscribe = subscribeToEntityComments('vendor', 'vendor-1', callback)

      expect(supabase.channel).toHaveBeenCalledWith('comments:vendor:vendor-1')
      expect(mockOn).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          table: 'comments',
          filter: 'entity_type=eq.vendor&entity_id=eq.vendor-1'
        }),
        expect.any(Function)
      )

      // Test unsubscribe
      unsubscribe()
      expect(supabase.removeChannel).toHaveBeenCalled()
    })
  })
})
