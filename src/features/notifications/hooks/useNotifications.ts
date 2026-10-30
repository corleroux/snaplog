/**
 * useNotifications Hook
 *
 * React hook for managing notifications state and subscriptions.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { createLogger } from '@/lib/logger'
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeToNotifications,
  getNotificationIcon,
  getNotificationColor,
  type Notification,
} from '@/lib/notifications/api'

const log = createLogger('useNotifications')

export function useNotifications() {
  const navigate = useNavigate()

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Load initial data
  useEffect(() => {
    loadNotifications()
    loadUnreadCount()
  }, [])

  // Subscribe to real-time updates
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null

    const setupSubscription = async () => {
      subscription = await subscribeToNotifications((payload) => {
        if (payload.eventType === 'INSERT') {
          // New notification - add to list and increment count
          if (payload.new) {
            setNotifications((prev) => [payload.new!, ...prev])
            if (!payload.new.read_at) {
              setUnreadCount((prev) => prev + 1)
            }
          }
        } else if (payload.eventType === 'UPDATE') {
          // Notification updated - refresh lists
          loadNotifications()
          loadUnreadCount()
        } else if (payload.eventType === 'DELETE') {
          // Notification deleted - remove from list
          if (payload.old) {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old!.id))
            if (!payload.old.read_at) {
              setUnreadCount((prev) => Math.max(0, prev - 1))
            }
          }
        }
      })
    }

    setupSubscription()

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  async function loadNotifications() {
    try {
      setLoading(true)
      const { notifications: notifs } = await getAllNotifications({ limit: 50 })
      setNotifications(notifs)
    } catch (err) {
      // Gracefully handle if notifications table doesn't exist (404)
      const isTableMissing = err && typeof err === 'object' && 'message' in err &&
        (err.message as string).includes('does not exist')

      if (!isTableMissing) {
        log.error('Failed to load notifications', { error: err instanceof Error ? err.message : String(err) })
      }
      // Set empty notifications if table doesn't exist
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  async function loadUnreadCount() {
    try {
      const count = await getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      // Gracefully handle if notifications table doesn't exist (404)
      // Treat as "no notifications" rather than an error
      const isNotFound = err && typeof err === 'object' && 'code' in err && err.code === 'PGRST204'
      const isTableMissing = err && typeof err === 'object' && 'message' in err &&
        (err.message as string).includes('does not exist')

      if (!isNotFound && !isTableMissing) {
        log.error('Failed to load unread count', { error: err instanceof Error ? err.message : String(err) })
      }
      // Set unread count to 0 if table doesn't exist
      setUnreadCount(0)
    }
  }

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    const success = await markAsRead(notificationId)
    if (success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    return success
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    const success = await markAllAsRead()
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    }
    return success
  }, [])

  const handleDelete = useCallback(async (notificationId: string) => {
    const success = await deleteNotification(notificationId)
    if (success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
      // Update unread count if the deleted notification was unread
      const deleted = notifications.find((n) => n.id === notificationId)
      if (deleted && !deleted.read_at) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    }
    return success
  }, [notifications])

  const handleClick = useCallback(
    async (notification: Notification) => {
      // Mark as read if unread
      if (!notification.read_at) {
        await handleMarkAsRead(notification.id)
      }

      // Navigate to action URL if present
      if (notification.action_url) {
        navigate(notification.action_url)
      }
    },
    [navigate, handleMarkAsRead]
  )

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    delete: handleDelete,
    handleClick,
    refresh: loadNotifications,
    getIcon: getNotificationIcon,
    getColor: getNotificationColor,
  }
}
