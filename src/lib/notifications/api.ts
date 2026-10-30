/**
 * Notifications API
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Notifications')

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  action_url: string | null
  read_at: string | null
  created_at: string
  metadata: Record<string, unknown>
  entity_id: string | null
  entity_type: string | null
}

export interface NotificationCreateInput {
  userId: string
  type: string
  title: string
  body?: string
  actionUrl?: string
  metadata?: Record<string, unknown>
  entityId?: string
  entityType?: string
}

/**
 * Fetch notifications for current user
 */
export async function getNotifications(options: {
  unreadOnly?: boolean
  limit?: number
} = {}): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (options.unreadOnly) {
    query = query.is('read_at', null)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch notifications: ${error.message}`)
  }

  return (data as Notification[]) || []
}

/**
 * Get unread notifications for the current user.
 */
export async function getUnreadNotifications(): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return (data || []) as Notification[]
  } catch (err) {
    logger.error('Failed to fetch unread notifications', { error: err })
    return []
  }
}

/**
 * Get all notifications for the current user (paginated).
 */
export async function getAllNotifications(options: {
  limit?: number
  offset?: number
  includeRead?: boolean
} = {}): Promise<{ notifications: Notification[]; total: number }> {
  const { limit = 50, offset = 0, includeRead = true } = options

  try {
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })

    if (!includeRead) {
      query = query.is('read_at', null)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      notifications: (data || []) as Notification[],
      total: count || 0,
    }
  } catch (err) {
    logger.error('Failed to fetch notifications', { error: err })
    return { notifications: [], total: 0 }
  }
}

/**
 * Get count of unread notifications.
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null)

    if (error) throw error

    return count || 0
  } catch (err) {
    logger.error('Failed to fetch unread count', { error: err })
    return 0
  }
}

/**
 * Mark a notification as read.
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error

    return true
  } catch (err) {
    logger.error('Failed to mark notification as read', { error: err })
    return false
  }
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllAsRead(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)

    if (error) throw error

    return true
  } catch (err) {
    logger.error('Failed to mark all notifications as read', { error: err })
    return false
  }
}

/**
 * Delete a notification.
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) throw error

    return true
  } catch (err) {
    logger.error('Failed to delete notification', { error: err })
    return false
  }
}

/**
 * Create a notification (admin/system use).
 */
export async function createNotification(input: NotificationCreateInput): Promise<Notification | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body || null,
        action_url: input.actionUrl || null,
        metadata: input.metadata || {},
        entity_id: input.entityId || null,
        entity_type: input.entityType || null,
      })
      .select()
      .single()

    if (error) throw error

    return data as Notification
  } catch (err) {
    logger.error('Failed to create notification', { error: err })
    return null
  }
}

/**
 * Subscribe to real-time notification updates for the current user.
 */
export async function subscribeToNotifications(callback: (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Notification | null
  old: Notification | null
}) => void) {
  const { data: { user } } = await supabase.auth.getUser()

  return supabase
    .channel(`notifications:${user?.id || 'anonymous'}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id || ''}`,
      },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as Notification | null,
          old: payload.old as Notification | null,
        })
      }
    )
    .subscribe()
}

/**
 * Get notification icon string based on type.
 */
export function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    share_link_created: '\u{1F517}',
    vendor_added: '\u{1F3EA}',
    style_added: '\u{1F457}',
    vendor_updated: '\u{270F}\uFE0F',
    style_updated: '\u{270F}\uFE0F',
    user_invited: '\u{1F464}',
    event_created: '\u{1F4C5}',
    warning: '\u{26A0}\uFE0F',
    error: '\u{274C}',
    success: '\u{2705}',
    info: '\u{2139}\uFE0F',
  }
  return icons[type] || '\u{1F4AC}'
}

/**
 * Get notification color class based on type.
 */
export function getNotificationColor(type: string): string {
  const colors: Record<string, string> = {
    share_link_created: 'text-blue-500',
    vendor_added: 'text-green-500',
    style_added: 'text-purple-500',
    vendor_updated: 'text-yellow-500',
    style_updated: 'text-yellow-500',
    user_invited: 'text-indigo-500',
    event_created: 'text-pink-500',
    warning: 'text-orange-500',
    error: 'text-red-500',
    success: 'text-green-500',
    info: 'text-blue-500',
  }
  return colors[type] || 'text-gray-500'
}

/** @deprecated Use getNotificationColor */
export function getNotificationTypeColor(type: string): string {
  const colors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
  }
  return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
}
