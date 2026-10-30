/**
 * Notifications Feature
 *
 * UI components, hooks, and API utilities for in-app notifications.
 * Service-layer functions are re-exported from @/lib/notifications/api.
 */

export { NotificationBell, NotificationCenter } from './components/NotificationCenter'
export { NotificationPreferences } from './components/NotificationPreferences'
export { useNotifications } from './hooks/useNotifications'
export {
  getUnreadNotifications,
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
  subscribeToNotifications,
  getNotificationIcon,
  getNotificationColor,
  type Notification,
  type NotificationCreateInput,
} from '@/lib/notifications/api'
