import { supabase } from '@/lib/supabase/client'
import type { Event } from '@/lib/supabase/types'

/**
 * Fetch all events the authenticated user is a member of.
 *
 * Uses an optimized RPC function that joins event_members and events
 * in a single database query, reducing critical path latency.
 *
 * RLS is handled by Supabase policies in the database.
 */
export async function getEvents(): Promise<Event[]> {
  const { data, error } = await supabase.rpc('get_user_events')

  if (error) {
    throw error
  }

  return data ?? []
}
