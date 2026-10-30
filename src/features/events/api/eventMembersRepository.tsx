/**
 * Event Members Repository
 *
 * Provides operations for managing event members:
 * - Get event members with profile data
 * - Search users by email
 * - Add members to events
 * - Remove members from events
 */

import { supabase } from '@/lib/supabase/client'
import type { Profile, EventMember } from '@/lib/supabase/types'

/**
 * App-facing event member record (camelCase for frontend)
 */
export interface EventMemberRecord {
  id: string
  eventId: string
  userId: string
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  createdAt: string
  profile?: {
    id: string
    fullName: string | null
    avatarUrl: string | null
    companyName: string | null
    email?: string | null
  }
}

/**
 * Input for adding a member to an event
 */
export interface AddMemberInput {
  eventId: string
  email: string
  role: 'editor' // Fixed role per requirements
}

/**
 * Convert persistence-facing event_members row to app-facing EventMemberRecord
 */
function eventMemberRowToEventMemberRecord(
  member: EventMember & {
    profiles?: Profile | null
  }
): EventMemberRecord {
  return {
    id: member.id,
    eventId: member.event_id,
    userId: member.user_id,
    role: member.role as 'owner' | 'admin' | 'editor' | 'viewer',
    createdAt: member.created_at,
    profile: member.profiles
      ? {
          id: member.profiles.id,
          fullName: member.profiles.full_name,
          avatarUrl: member.profiles.avatar_url,
          companyName: member.profiles.company_name,
          email: (member.profiles as any).email || null,
        }
      : undefined,
  }
}

/**
 * Get all members for an event with profile data
 */
export async function getEventMembers(eventId: string): Promise<EventMemberRecord[]> {
  const { data, error } = await supabase
    .from('event_members')
    .select(`
      *,
      profiles(*)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []).map(eventMemberRowToEventMemberRecord)
}

/**
 * Search for users by email (case-insensitive partial match)
 *
 * Delegates to the search_profiles_by_email RPC (SECURITY DEFINER) so the
 * caller never has direct SELECT access to all profiles.
 */
export async function searchUsersByEmail(emailQuery: string): Promise<Profile[]> {
  if (!emailQuery || emailQuery.trim().length < 2) {
    return []
  }

  const { data, error } = await supabase.rpc('search_profiles_by_email', {
    query: emailQuery.trim(),
    result_limit: 10,
  })

  if (error) {
    throw error
  }

  return (data as Profile[]) || []
}

/**
 * Add a member to an event
 *
 * @throws Error if user is not found in profiles table
 * @throws Error if user is already a member (unique constraint)
 */
export async function addMemberToEvent(input: AddMemberInput): Promise<void> {
  // Look up the user via the rate-limited RPC — never direct table SELECT
  const { data: results, error: searchError } = await supabase.rpc('search_profiles_by_email', {
    query: input.email,
    result_limit: 1,
  })

  if (searchError) {
    throw searchError
  }

  const profiles = results as { id: string }[] | null

  if (!profiles || profiles.length === 0) {
    throw new Error('User not found. Please check the email address.')
  }

  const userId = profiles[0].id

  // Check if already a member
  const { data: existing, error: checkError } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', input.eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError
  }

  if (existing) {
    throw new Error('This user is already a member of this event.')
  }

  // Add the member
  const { error: insertError } = await supabase
    .from('event_members')
    .insert({
      event_id: input.eventId,
      user_id: userId,
      role: input.role,
    })

  if (insertError) {
    throw insertError
  }
}

/**
 * Remove a member from an event
 *
 * @throws Error if trying to remove the last owner
 */
export async function removeMemberFromEvent(eventId: string, userId: string): Promise<void> {
  // Check if this is the last owner
  const { data: owners, error: ownerCheckError } = await supabase
    .from('event_members')
    .select('id')
    .eq('event_id', eventId)
    .eq('role', 'owner')

  if (ownerCheckError) {
    throw ownerCheckError
  }

  // Check if the user being removed is an owner
  const { data: memberToRemove, error: memberError } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle()

  if (memberError) {
    throw memberError
  }

  // Prevent removing the last owner
  if (memberToRemove?.role === 'owner' && owners && owners.length <= 1) {
    throw new Error('Cannot remove the last owner from the event.')
  }

  // Remove the member
  const { error: deleteError } = await supabase
    .from('event_members')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)

  if (deleteError) {
    throw deleteError
  }
}
