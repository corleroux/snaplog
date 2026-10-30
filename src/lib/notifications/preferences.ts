/**
 * Notification Preferences API
 *
 * Functions for managing user notification preferences.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Notification event types
 */
export type NotificationEventType =
  | 'vendor_created'
  | 'vendor_updated'
  | 'style_created'
  | 'style_committed'
  | 'extraction_error'
  | 'extraction_complete'
  | 'user_invited'
  | 'user_role_changed'
  | 'event_shared'

/**
 * Notification preference from notification_preferences table
 */
export interface NotificationPreference {
  id: string
  user_id: string
  event_type: NotificationEventType
  enabled: boolean
  channel_email: boolean
  channel_in_app: boolean
  created_at: string
  updated_at: string
}

/**
 * Display info for an event type
 */
export interface EventTypeInfo {
  id: NotificationEventType
  label: string
  description: string
  defaultEmail: boolean
  defaultInApp: boolean
}

/**
 * Event type display info
 */
export const EVENT_TYPE_INFO: Record<NotificationEventType, EventTypeInfo> = {
  vendor_created: {
    id: 'vendor_created',
    label: 'Vendor Created',
    description: 'When a new vendor is added to an event',
    defaultEmail: true,
    defaultInApp: true,
  },
  vendor_updated: {
    id: 'vendor_updated',
    label: 'Vendor Updated',
    description: 'When a vendor is modified',
    defaultEmail: false,
    defaultInApp: true,
  },
  style_created: {
    id: 'style_created',
    label: 'Style Created',
    description: 'When a new fabric style is added',
    defaultEmail: true,
    defaultInApp: true,
  },
  style_committed: {
    id: 'style_committed',
    label: 'Style Committed',
    description: 'When a style is committed and goes live',
    defaultEmail: true,
    defaultInApp: true,
  },
  extraction_error: {
    id: 'extraction_error',
    label: 'Extraction Errors',
    description: 'When AI extraction encounters an error',
    defaultEmail: true,
    defaultInApp: true,
  },
  extraction_complete: {
    id: 'extraction_complete',
    label: 'Extraction Complete',
    description: 'When AI extraction finishes',
    defaultEmail: false,
    defaultInApp: true,
  },
  user_invited: {
    id: 'user_invited',
    label: 'User Invited',
    description: 'When you invite someone to the system',
    defaultEmail: true,
    defaultInApp: true,
  },
  user_role_changed: {
    id: 'user_role_changed',
    label: 'Role Changed',
    description: 'When your role is changed',
    defaultEmail: true,
    defaultInApp: true,
  },
  event_shared: {
    id: 'event_shared',
    label: 'Event Shared',
    description: 'When an event is shared',
    defaultEmail: false,
    defaultInApp: true,
  },
}

/**
 * Fetch notification preferences for current user
 */
export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  // Ensure defaults exist
  await supabase.rpc('ensure_default_preferences', { p_user_id: user.id })

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    throw new Error(`Failed to fetch preferences: ${error.message}`)
  }

  return (data as NotificationPreference[]) || []
}

/**
 * Update a notification preference
 */
export async function updateNotificationPreference(
  eventType: NotificationEventType,
  updates: {
    enabled?: boolean
    channel_email?: boolean
    channel_in_app?: boolean
  }
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase
    .from('notification_preferences')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('event_type', eventType)

  if (error) {
    throw new Error(`Failed to update preference: ${error.message}`)
  }
}

/**
 * Check if a notification should be sent for a user and event type
 */
export async function shouldSendNotification(
  userId: string,
  eventType: NotificationEventType,
  channel: 'email' | 'in_app'
): Promise<boolean> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('enabled, channel_email, channel_in_app')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .maybeSingle()

  if (!data) {
    // Default to enabled if no preference set
    return true
  }

  if (!data.enabled) {
    return false
  }

  return channel === 'email' ? data.channel_email : data.channel_in_app
}
