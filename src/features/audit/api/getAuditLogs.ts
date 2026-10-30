/**
 * Audit Log API
 *
 * Functions for retrieving and filtering audit logs.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AuditLogs')

export interface AuditLogFilters {
  entityType?: string
  action?: string
  userId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  pageSize?: number
}

export interface AuditLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  changes: Record<string, unknown> | null
  user_id: string | null
  created_at: string
  user_email?: string
}

export interface AuditLogResult {
  logs: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Get audit logs with optional filtering and pagination.
 */
export async function getAuditLogs(
  filters: AuditLogFilters = {}
): Promise<AuditLogResult> {
  const {
    entityType,
    action,
    userId,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 50,
  } = filters

  try {
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    // Apply filters
    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (action) {
      query = query.eq('action', action)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Calculate pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // Execute query with pagination
    query = query
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    // Enrich logs with user emails
    const enrichedLogs = await enrichWithUserEmails(data || [])

    return {
      logs: enrichedLogs,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    }
  } catch (err) {
    logger.error('Failed to fetch audit logs', { error: err })
    throw err
  }
}

/**
 * Enrich audit logs with user emails by fetching user profiles.
 */
async function enrichWithUserEmails(
  logs: AuditLogEntry[]
): Promise<AuditLogEntry[]> {
  const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))]

  if (userIds.length === 0) {
    return logs
  }

  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds as string[])

    const emailMap = new Map(profiles?.map((p) => [p.id, p.email]) || [])

    return logs.map((log) => ({
      ...log,
      user_email: log.user_id ? emailMap.get(log.user_id) || undefined : undefined,
    }))
  } catch (err) {
    logger.warn('Failed to enrich logs with user emails', { error: err })
    return logs
  }
}

/**
 * Get unique entity types from audit logs.
 */
export async function getEntityTypes(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('entity_type')

    if (error) throw error

    const uniqueTypes = [...new Set(data?.map((d) => d.entity_type) || [])]
    return uniqueTypes.sort()
  } catch (err) {
    logger.error('Failed to fetch entity types', { error: err })
    return []
  }
}

/**
 * Get unique actions from audit logs.
 */
export async function getActions(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action')

    if (error) throw error

    const uniqueActions = [...new Set(data?.map((d) => d.action) || [])]
    return uniqueActions.sort()
  } catch (err) {
    logger.error('Failed to fetch actions', { error: err })
    return []
  }
}

/**
 * Export audit logs as CSV.
 */
export async function exportAuditLogsAsCsv(filters: AuditLogFilters = {}): Promise<string> {
  // Fetch all matching logs (no pagination for export)
  const result = await getAuditLogs({
    ...filters,
    page: 1,
    pageSize: 10000, // Large page size for export
  })

  // Generate CSV header
  const headers = ['Timestamp', 'User', 'Email', 'Entity Type', 'Entity ID', 'Action', 'Changes']

  // Generate CSV rows
  const rows = result.logs.map((log) => [
    log.created_at,
    log.user_id || '',
    log.user_email || '',
    log.entity_type,
    log.entity_id,
    log.action,
    log.changes ? JSON.stringify(log.changes) : '',
  ])

  // Combine header and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape quotes and wrap in quotes if contains comma or quote
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    ),
  ].join('\n')

  return csvContent
}
