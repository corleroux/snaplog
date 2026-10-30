/**
 * Notifications API Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

import { supabase } from '@/lib/supabase/client'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  getNotificationTypeColor,
} from '@/lib/notifications/api'

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNotifications', () => {
    it('should fetch notifications for current user', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      } as never)

      const mockNotifications = [
        { id: 'notif-1', user_id: 'user-123', title: 'Test', type: 'info', read: false },
        { id: 'notif-2', user_id: 'user-123', title: 'Test 2', type: 'success', read: true },
      ]

      // Create a promise that also has chaining methods
      const basePromise = Promise.resolve({
        data: mockNotifications,
        error: null,
      })

      const queryResult = Object.assign(basePromise, {
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }) as any

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(queryResult),
          }),
        }),
      } as any)

      const notifications = await getNotifications()

      expect(notifications).toEqual(mockNotifications)
      expect(supabase.from).toHaveBeenCalledWith('notifications')
    })

    it('should filter unread notifications when requested', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      } as never)

      const basePromise = Promise.resolve({
        data: [],
        error: null,
      })

      const queryResult = Object.assign(basePromise, {
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      }) as any

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue(queryResult),
            }),
          }),
        }),
      } as any)

      await getNotifications({ unreadOnly: true })

      expect(supabase.from).toHaveBeenCalledWith('notifications')
    })
  })

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      } as never)

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            count: 5,
            error: null,
          }),
        }),
      } as any)

      const count = await getUnreadCount()

      expect(count).toBe(5)
    })

    it('should return 0 when user not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
      } as never)

      const count = await getUnreadCount()

      expect(count).toBe(0)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      const result = await markAsRead('notif-1')
      expect(result).toBe(true)

      expect(supabase.from).toHaveBeenCalledWith('notifications')
    })

    it('should return false on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Not found' },
          }),
        }),
      } as any)

      const result = await markAsRead('notif-1')
      expect(result).toBe(false)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      const result = await markAllAsRead()
      expect(result).toBe(true)

      expect(supabase.from).toHaveBeenCalledWith('notifications')
    })
  })

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      } as any)

      const result = await deleteNotification('notif-1')
      expect(result).toBe(true)

      expect(supabase.from).toHaveBeenCalledWith('notifications')
    })
  })

  describe('createNotification', () => {
    it('should create notification', async () => {
      const mockNotification = {
        id: 'notif-1',
        user_id: 'user-123',
        type: 'info',
        title: 'Test',
        body: 'Test body',
        read: false,
      }

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockNotification,
              error: null,
            }),
          }),
        }),
      } as any)

      const notification = await createNotification({
        userId: 'user-123',
        type: 'info',
        title: 'Test',
        body: 'Test body',
      })

      expect(notification).toEqual(mockNotification)
      expect(supabase.from).toHaveBeenCalledWith('notifications')
    })
  })

  describe('getNotificationTypeColor', () => {
    it('should return correct colors for each type', () => {
      expect(getNotificationTypeColor('info')).toContain('bg-blue-')
      expect(getNotificationTypeColor('success')).toContain('bg-green-')
      expect(getNotificationTypeColor('warning')).toContain('bg-yellow-')
      expect(getNotificationTypeColor('error')).toContain('bg-red-')
    })
  })
})
