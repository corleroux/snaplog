/**
 * Approvals API Functions
 *
 * Functions for managing approval requests on entities.
 */

import { supabase } from '@/lib/supabase/client'
import type { ApprovalEntityType, ApprovalStatus } from '@/components/approval/ApprovalRequest'

/**
 * Convert database approval status to ApprovalStatus type
 */
function fromDbApproval(db: any): ApprovalStatus {
  return {
    id: db.id,
    entityType: db.entity_type as ApprovalEntityType,
    entityId: db.entity_id,
    requestedBy: db.requested_by,
    requestedByEmail: db.requested_by_email,
    requestedByName: db.requested_by_name,
    requestedAt: db.requested_at,
    status: db.status as 'pending' | 'approved' | 'rejected',
    respondedBy: db.responded_by,
    respondedByEmail: db.responded_by_email,
    respondedByName: db.responded_by_name,
    respondedAt: db.responded_at,
    responseNote: db.response_note,
    expiresAt: db.expires_at
  }
}

/**
 * Request approval for an entity
 */
export async function requestApproval(
  entityType: ApprovalEntityType,
  entityId: string,
  expiresInDays = 7
): Promise<string> {
  const { data, error } = await supabase.rpc('request_approval', {
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_expires_in: `${expiresInDays} days`
  })

  if (error) throw error
  return data
}

/**
 * Respond to an approval request
 */
export async function respondToApproval(
  requestId: string,
  status: 'approved' | 'rejected',
  note?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('respond_to_approval', {
    p_request_id: requestId,
    p_status: status,
    p_note: note || null
  })

  if (error) throw error
  return data ?? false
}

/**
 * Get approval status for an entity
 */
export async function getApprovalStatus(
  entityType: ApprovalEntityType,
  entityId: string
): Promise<ApprovalStatus[]> {
  const { data, error } = await supabase.rpc('get_approval_status', {
    p_entity_type: entityType,
    p_entity_id: entityId
  })

  if (error) throw error
  return (data || []).map(fromDbApproval)
}

/**
 * Get latest approval status for an entity
 */
export async function getLatestApprovalStatus(
  entityType: ApprovalEntityType,
  entityId: string
): Promise<ApprovalStatus | null> {
  const statuses = await getApprovalStatus(entityType, entityId)
  return statuses.length > 0 ? statuses[0] : null
}

/**
 * Get pending approval requests for an event
 */
export async function getPendingApprovals(eventId: string): Promise<{
  id: string
  entityType: ApprovalEntityType
  entityId: string
  entityName: string
  requestedBy: string
  requestedByEmail: string
  requestedByName: string | null
  requestedAt: string
  expiresAt: string | null
}[]> {
  const { data, error } = await supabase.rpc('get_pending_approvals', {
    p_event_id: eventId
  })

  if (error) throw error
  return (data || []).map((item: any) => ({
    id: item.id,
    entityType: item.entity_type as ApprovalEntityType,
    entityId: item.entity_id,
    entityName: item.entity_name,
    requestedBy: item.requested_by,
    requestedByEmail: item.requested_by_email,
    requestedByName: item.requested_by_name,
    requestedAt: item.requested_at,
    expiresAt: item.expires_at
  }))
}

/**
 * Subscribe to approval changes for an entity
 */
export function subscribeToApprovalChanges(
  entityType: ApprovalEntityType,
  entityId: string,
  callback: (status: ApprovalStatus) => void
): () => void {
  const channel = supabase
    .channel(`approval:${entityType}:${entityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'approval_requests',
        filter: `entity_type=eq.${entityType}&entity_id=eq.${entityId}`
      },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          // Fetch full approval status with user info
          const statuses = await getApprovalStatus(entityType, entityId)
          const latest = statuses.find(s => s.id === (payload.new as any).id)
          if (latest) {
            callback(latest)
          }
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
