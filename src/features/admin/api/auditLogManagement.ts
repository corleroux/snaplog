/**
 * Audit Log Management API
 *
 * Functions for viewing audit logs in the admin panel.
 */

import { supabase, invokeEdgeFunction } from '@/lib/supabase/client'

/**
 * Audit log entry from audit_log table
 */
export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  changes: Record<string, { old: unknown; new: unknown }> | null
  performed_by: string | null
  created_at: string
}

/**
 * Extended audit log with performer info
 */
export interface AuditLogEntryWithPerformer extends AuditLogEntry {
  performed_by_email?: string | null
  performed_by_name?: string | null
}

/**
 * Fetch audit logs with filters and pagination
 */
export async function getAuditLogs(options: {
  entityType?: string
  action?: string
  entityId?: string
  limit?: number
  offset?: number
}): Promise<AuditLogEntryWithPerformer[]> {
  let query = supabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })

  if (options.entityType) {
    query = query.eq('entity_type', options.entityType)
  }
  if (options.action) {
    query = query.eq('action', options.action)
  }
  if (options.entityId) {
    query = query.eq('entity_id', options.entityId)
  }
  if (options.limit) {
    query = query.limit(options.limit)
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`)
  }

  // Fetch performer info for each log
  const logs = data as AuditLogEntry[]
  const performerIds = logs
    .map((log) => log.performed_by)
    .filter((id): id is string => id !== null)

  let performers: Record<string, { email: string | null; raw_user_meta_data: { full_name?: string } }> = {}
  if (performerIds.length > 0) {
    const { data } = await invokeEdgeFunction<{ users: Array<{ id: string; email: string; raw_user_meta_data: { full_name?: string } }> }>('get-admin-users')
    performers = (data?.users ?? [])
      .filter((u) => performerIds.includes(u.id))
      .reduce((acc, user) => {
        acc[user.id] = user
        return acc
      }, {} as Record<string, { email: string | null; raw_user_meta_data: { full_name?: string } }>)
  }

  return logs.map((log) => ({
    ...log,
    performed_by_email: log.performed_by ? (performers[log.performed_by]?.email ?? undefined) : undefined,
    performed_by_name: log.performed_by ? performers[log.performed_by]?.raw_user_meta_data?.full_name : undefined,
  }))
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(): Promise<{
  total: number
  byAction: Record<string, number>
  byEntityType: Record<string, number>
}> {
  // Get total count
  const { count: total } = await supabase
    .from('audit_log')
    .select('*', { count: 'exact', head: true })

  // Get all logs for stats (could be optimized with SQL aggregation)
  const { data: logs } = await supabase
    .from('audit_log')
    .select('action, entity_type')

  const byAction: Record<string, number> = {}
  const byEntityType: Record<string, number> = {}

  logs?.forEach((log: any) => {
    byAction[log.action] = (byAction[log.action] || 0) + 1
    byEntityType[log.entity_type] = (byEntityType[log.entity_type] || 0) + 1
  })

  return {
    total: total || 0,
    byAction,
    byEntityType,
  }
}

/**
 * Get action badge color
 */
export function getActionBadgeColor(action: string): string {
  switch (action) {
    case 'create':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    case 'update':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
    case 'archive':
    case 'delete':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
    case 'ERROR':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
  }
}

/**
 * Get entity type label
 */
export function getEntityTypeLabel(entityType: string): string {
  switch (entityType) {
    case 'vendor':
      return 'Vendor'
    case 'fabric_style':
      return 'Style'
    case 'fabric_variant':
      return 'Variant'
    case 'fabric_image':
      return 'Image'
    case 'event':
      return 'Event'
    default:
      return entityType
  }
}
