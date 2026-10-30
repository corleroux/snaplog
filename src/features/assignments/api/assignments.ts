/**
 * Assignment API Functions
 *
 * Functions for managing entity assignments to users.
 */

import { supabase } from '@/lib/supabase/client'

// Assignments table types (will be in database.types after migration)
type Assignment = {
  id: string
  entity_type: 'vendor' | 'style' | 'variant'
  entity_id: string
  assigned_to: string
  assigned_by: string
  assigned_at: string
  notes: string | null
  created_at: string
  updated_at: string
}

type AssignmentInsert = Omit<Assignment, 'id' | 'created_at' | 'updated_at'>

export type EntityType = 'vendor' | 'style' | 'variant'

/**
 * Get all assignments for an entity
 */
export async function getEntityAssignments(
  entityType: EntityType,
  entityId: string
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('assigned_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get assignments with user details for an entity
 */
export async function getEntityAssignees(
  entityType: EntityType,
  entityId: string
): Promise<Array<{
  userId: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  assignedAt: string
  assignedByEmail: string
  notes: string | null
}>> {
  const { data, error } = await supabase.rpc('get_entity_assignees', {
    p_entity_type: entityType,
    p_entity_id: entityId,
  })

  if (error) throw error

  return (data || []).map((r: any) => ({
    userId: r.user_id,
    email: r.email,
    fullName: r.full_name,
    avatarUrl: r.avatar_url,
    assignedAt: r.assigned_at,
    assignedByEmail: r.assigned_by_email,
    notes: r.notes,
  }))
}

/**
 * Assign an entity to a user
 */
export async function assignEntity(
  entityType: EntityType,
  entityId: string,
  assignedTo: string,
  notes?: string
): Promise<Assignment> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const { data, error } = await supabase
    .from('assignments')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      assigned_to: assignedTo,
      assigned_by: user.id,
      notes: notes || null,
    } as AssignmentInsert)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove an assignment
 */
export async function unassignEntity(
  entityType: EntityType,
  entityId: string,
  assignedTo: string
): Promise<void> {
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('assigned_to', assignedTo)

  if (error) throw error
}

/**
 * Get all entities assigned to a user
 */
export async function getUserAssignments(
  userId: string,
  entityType?: EntityType
): Promise<Array<{
  entityType: EntityType
  entityId: string
  entityName: string | null
  eventId: string | null
  eventName: string | null
  assignedAt: string
  assignedByEmail: string
  notes: string | null
}>> {
  const { data, error } = await supabase.rpc('get_user_assignments', {
    p_user_id: userId,
    p_entity_type: entityType || null,
  })

  if (error) throw error
  return data || []
}

/**
 * Subscribe to assignment changes for an entity
 */
export function subscribeToEntityAssignments(
  entityType: EntityType,
  entityId: string,
  callback: (assignments: Assignment[]) => void
) {
  return supabase
    .channel(`assignments:${entityType}:${entityId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'assignments',
        filter: `entity_type=eq.${entityType}&entity_id=eq.${entityId}`,
      },
      async () => {
        const assignments = await getEntityAssignments(entityType, entityId)
        callback(assignments)
      }
    )
    .subscribe()
}
