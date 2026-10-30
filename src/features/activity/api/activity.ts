/**
 * Activity Feed API Functions
 *
 * Functions for fetching activity data from audit logs.
 */

import { supabase } from '@/lib/supabase/client'
import type { Activity } from '@/components/activity/ActivityFeed'

/**
 * Convert audit log to Activity type
 */
function fromAuditLog(log: any): Activity {
  return {
    id: log.id,
    type: 'other', // Will be determined by the component
    action: log.action,
    entityName: log.entity_name || log.entity_id,
    entityType: log.entity_type,
    entityId: log.entity_id,
    userId: log.user_id,
    userEmail: log.user_email || 'unknown@example.com',
    userName: log.user_name,
    timestamp: log.created_at,
    metadata: log.changes ? { changes: log.changes } : undefined
  }
}

/**
 * Get activities for an event
 */
export async function getEventActivities(
  eventId: string,
  limit = 50
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(fromAuditLog)
}

/**
 * Get activities for a specific entity
 */
export async function getEntityActivities(
  entityType: string,
  entityId: string,
  limit = 20
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(fromAuditLog)
}

/**
 * Get activities by user
 */
export async function getUserActivities(
  userId: string,
  limit = 20
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(fromAuditLog)
}

/**
 * Get activities filtered by type
 */
export async function getActivitiesByType(
  action: string,
  limit = 20
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .ilike('action', `%${action}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map(fromAuditLog)
}

/**
 * Subscribe to activity changes for an event
 */
export function subscribeToEventActivities(
  eventId: string,
  callback: (activity: Activity) => void
): () => void {
  const channel = supabase
    .channel(`activity:event:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs',
        filter: `event_id=eq.${eventId}`
      },
      (payload) => {
        callback(fromAuditLog(payload.new))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to activity changes for an entity
 */
export function subscribeToEntityActivities(
  entityType: string,
  entityId: string,
  callback: (activity: Activity) => void
): () => void {
  const channel = supabase
    .channel(`activity:${entityType}:${entityId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'audit_logs',
        filter: `entity_type=eq.${entityType}&entity_id=eq.${entityId}`
      },
      (payload) => {
        callback(fromAuditLog(payload.new))
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
