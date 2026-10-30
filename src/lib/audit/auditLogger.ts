/**
 * Audit Logger - Post-commit mutation tracking
 *
 * Records all creates, updates, and archives to an audit_log table.
 * This provides a complete change history for any entity.
 */

import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'
import { createLogger } from '@/lib/logger'

const logger = createLogger('AuditLog')

export interface AuditEntry {
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'archive' | 'delete'
  changes?: Record<string, { old: unknown; new: unknown }>
}

/**
 * Write an audit log entry.
 *
 * Failures are logged but not thrown — audit logging should never
 * block the primary operation.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const userId = await getCurrentUserId()

    const { error } = await supabase.from('audit_log').insert({
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      changes: entry.changes || null,
      performed_by: userId,
    })

    if (error) {
      logger.error('Failed to write audit log', { error: error.message, entry })
    }
  } catch (err) {
    logger.error('Audit log write failed', { error: String(err), entry })
  }
}
