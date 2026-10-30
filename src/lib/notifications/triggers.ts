/**
 * Notification Triggers
 *
 * Functions that trigger notifications for key events.
 */

import { supabase } from '@/lib/supabase/client'
import { createNotification } from './api'
import { createLogger } from '@/lib/logger'

const log = createLogger('notificationTriggers')

/**
 * Notification event types
 */
export type NotificationEvent =
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
 * Trigger a notification event
 *
 * This function creates notifications for relevant users based on the event type.
 * In production, this could be an edge function that runs asynchronously.
 */
export async function triggerNotification(
  _event: NotificationEvent,
  data: {
    userIds?: string[] // Specific users to notify
    eventId?: string // Will notify event members
    actorId?: string // User who triggered the event
    entityId?: string // Related entity ID
    title: string
    body?: string
    actionUrl?: string
    type?: 'info' | 'success' | 'warning' | 'error'
  }
): Promise<void> {
  const userIdsToNotify: string[] = []

  // Determine who to notify
  if (data.userIds) {
    userIdsToNotify.push(...data.userIds)
  } else if (data.eventId) {
    // Notify all event members
    const { data: members } = await supabase
      .from('event_members')
      .select('user_id')
      .eq('event_id', data.eventId)

    members?.forEach((member) => {
      if (member.user_id !== data.actorId) {
        userIdsToNotify.push(member.user_id)
      }
    })
  }

  // Create notifications for each user
  for (const userId of userIdsToNotify) {
    try {
      await createNotification({
        userId,
        type: data.type || 'info',
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl,
      })
    } catch (error) {
      log.error('Failed to create notification', { error: error instanceof Error ? error.message : String(error) })
      // Don't throw - notifications should never block the main operation
    }
  }
}

/**
 * Vendor created notification
 */
export async function notifyVendorCreated(options: {
  eventId: string
  vendorId: string
  vendorName: string
  actorId: string
}): Promise<void> {
  await triggerNotification('vendor_created', {
    eventId: options.eventId,
    actorId: options.actorId,
    entityId: options.vendorId,
    title: `New vendor: ${options.vendorName}`,
    body: `A new vendor "${options.vendorName}" has been added.`,
    actionUrl: `/events/${options.eventId}/vendors/${options.vendorId}`,
    type: 'success',
  })
}

/**
 * Vendor updated notification
 */
export async function notifyVendorUpdated(options: {
  eventId: string
  vendorId: string
  vendorName: string
  actorId: string
}): Promise<void> {
  await triggerNotification('vendor_updated', {
    eventId: options.eventId,
    actorId: options.actorId,
    entityId: options.vendorId,
    title: `Vendor updated: ${options.vendorName}`,
    body: `Vendor "${options.vendorName}" has been updated.`,
    actionUrl: `/events/${options.eventId}/vendors/${options.vendorId}`,
    type: 'info',
  })
}

/**
 * Style created notification
 */
export async function notifyStyleCreated(options: {
  eventId: string
  vendorId: string
  styleId: string
  styleName: string
  vendorName: string
  actorId: string
}): Promise<void> {
  await triggerNotification('style_created', {
    eventId: options.eventId,
    actorId: options.actorId,
    entityId: options.styleId,
    title: `New style: ${options.styleName}`,
    body: `A new style "${options.styleName}" has been added to ${options.vendorName}.`,
    actionUrl: `/events/${options.eventId}/vendors/${options.vendorId}/styles/${options.styleId}`,
    type: 'success',
  })
}

/**
 * Style committed notification
 */
export async function notifyStyleCommitted(options: {
  eventId: string
  vendorId: string
  styleId: string
  styleName: string
  vendorName: string
  actorId: string
}): Promise<void> {
  await triggerNotification('style_committed', {
    eventId: options.eventId,
    actorId: options.actorId,
    entityId: options.styleId,
    title: `Style committed: ${options.styleName}`,
    body: `Style "${options.styleName}" from ${options.vendorName} has been committed and is now live.`,
    actionUrl: `/events/${options.eventId}/vendors/${options.vendorId}/styles/${options.styleId}`,
    type: 'success',
  })
}

/**
 * Extraction error notification
 */
export async function notifyExtractionError(options: {
  eventId: string
  vendorId?: string
  styleId?: string
  errorMessage: string
  actorId: string
}): Promise<void> {
  await triggerNotification('extraction_error', {
    eventId: options.eventId,
    actorId: options.actorId,
    title: 'Extraction failed',
    body: `AI extraction encountered an error: ${options.errorMessage}`,
    actionUrl: options.vendorId && options.styleId
      ? `/events/${options.eventId}/vendors/${options.vendorId}/styles/${options.styleId}/edit`
      : `/events/${options.eventId}/vendors`,
    type: 'error',
  })
}

/**
 * Extraction complete notification
 */
export async function notifyExtractionComplete(options: {
  eventId: string
  vendorId: string
  styleId: string
  styleName: string
  confidence: number
  actorId: string
}): Promise<void> {
  const confidenceLabel = options.confidence >= 0.9 ? 'high' : options.confidence >= 0.7 ? 'medium' : 'low'

  await triggerNotification('extraction_complete', {
    userIds: [options.actorId],
    actorId: options.actorId,
    entityId: options.styleId,
    title: `Extraction complete: ${options.styleName}`,
    body: `AI extraction finished with ${confidenceLabel} confidence (${Math.round(options.confidence * 100)}%). Review the extracted data before committing.`,
    actionUrl: `/events/${options.eventId}/vendors/${options.vendorId}/styles/${options.styleId}/review`,
    type: options.confidence < 0.7 ? 'warning' : 'success',
  })
}

/**
 * User invited notification
 */
export async function notifyUserInvited(options: {
  userEmail: string
  invitedBy: string
  role: string
}): Promise<void> {
  // Get the user ID from email
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', options.userEmail)
    .single()

  if (user) {
    await triggerNotification('user_invited', {
      userIds: [user.id],
      title: `You've been invited to collaborate`,
      body: `You've been invited as a ${options.role} to Snaplog.`,
      actionUrl: '/',
      type: 'info',
    })
  }
}

/**
 * User role changed notification
 */
export async function notifyUserRoleChanged(options: {
  userId: string
  newRole: string
  changedBy: string
}): Promise<void> {
  await triggerNotification('user_role_changed', {
    userIds: [options.userId],
    title: `Your role has been changed`,
    body: `Your role has been updated to ${options.newRole}.`,
    actionUrl: '/',
    type: 'info',
  })
}

/**
 * Event shared notification
 */
export async function notifyEventShared(options: {
  eventId: string
  eventName: string
  sharedBy: string
  shareType: 'link' | 'email'
}): Promise<void> {
  await triggerNotification('event_shared', {
    eventId: options.eventId,
    actorId: options.sharedBy,
    title: `Event shared: ${options.eventName}`,
    body: `This event has been shared via ${options.shareType}.`,
    actionUrl: `/events/${options.eventId}/vendors`,
    type: 'info',
  })
}
