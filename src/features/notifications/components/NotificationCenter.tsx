/**
 * Notification Center Components
 *
 * In-app notification system components.
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, X, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationTypeColor,
  type Notification,
} from '@/lib/notifications/api'
import { formatDateTime } from '@/lib/utils/format'

/**
 * Notification Bell Button with Badge
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: getUnreadCount,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount && unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-20 w-80 sm:w-96 bg-background border border-border rounded-lg shadow-lg">
            <NotificationCenter onClose={() => setIsOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Notification Center Panel
 */
interface NotificationCenterProps {
  onClose?: () => void
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications({ limit: 20 }),
  })

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read_at) {
      markReadMutation.mutate(notification.id)
    }
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Notifications</h3>
        <div className="flex gap-2">
          {notifications && notifications.some((n) => !n.read_at) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="overflow-y-auto flex-1">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No notifications
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onDelete={() => deleteMutation.mutate(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Notification Item Component
 */
interface NotificationItemProps {
  notification: Notification
  onClick: () => void
  onDelete: () => void
}

function NotificationItem({ notification, onClick, onDelete }: NotificationItemProps) {
  const content = (
    <div
      className={`p-4 hover:bg-accent/50 transition-colors cursor-pointer ${
        !notification.read_at ? 'bg-accent/30' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full shrink-0 ${getNotificationTypeColor(notification.type)}`}>
          {notification.type === 'info' && 'ℹ️'}
          {notification.type === 'success' && '✓'}
          {notification.type === 'warning' && '⚠'}
          {notification.type === 'error' && '✕'}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm">{notification.title}</p>
            {!notification.read_at && (
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
            )}
          </div>

          {notification.body && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {notification.body}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-1">
            {formatDateTime(notification.created_at)}
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
        </Button>
      </div>
    </div>
  )

  // Wrap in Link if action_url exists
  if (notification.action_url) {
    return (
      <Link to={notification.action_url} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return content
}
