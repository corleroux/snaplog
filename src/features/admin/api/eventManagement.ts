/**
 * Event Management API
 *
 * Functions for managing events in the admin panel.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Event data from events table
 */
export interface AdminEvent {
  id: string
  name: string
  slug: string | null
  city: string | null
  country: string | null
  venue: string | null
  starts_on: string | null
  ends_on: string | null
  cover_image_url: string | null
  status: 'active' | 'upcoming' | 'archived'
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Extended event with counts
 */
export interface AdminEventWithCounts extends AdminEvent {
  vendor_count?: number
  style_count?: number
  member_count?: number
}

/**
 * Fetch all events with optional counts
 */
export async function getEvents(includeCounts = false): Promise<AdminEventWithCounts[]> {
  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  const events = data as AdminEvent[]

  if (!includeCounts) {
    return events
  }

  // Fetch counts for each event
  const eventsWithCounts = await Promise.all(
    events.map(async (event) => {
      const [{ count: vendorCount }, { count: styleCount }, { count: memberCount }] = await Promise.all([
        supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
        supabase.from('fabric_styles').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
        supabase.from('event_members').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
      ])

      return {
        ...event,
        vendor_count: vendorCount || 0,
        style_count: styleCount || 0,
        member_count: memberCount || 0,
      }
    })
  )

  return eventsWithCounts
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<AdminEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !data) {
    return null
  }

  return data as AdminEvent
}

/**
 * Get event statistics
 */
export async function getEventStats(): Promise<{
  total: number
  active: number
  upcoming: number
  archived: number
}> {
  // Get total events
  const { count: total } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })

  // Get by status
  const { data: events } = await supabase
    .from('events')
    .select('status')

  const stats = {
    total: total || 0,
    active: 0,
    upcoming: 0,
    archived: 0,
  }

  events?.forEach((event: any) => {
    if (event.status === 'active') stats.active++
    else if (event.status === 'upcoming') stats.upcoming++
    else if (event.status === 'archived') stats.archived++
  })

  return stats
}

/**
 * Update event status
 */
export async function updateEventStatus(eventId: string, status: 'active' | 'upcoming' | 'archived'): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId)

  if (error) {
    throw new Error(`Failed to update event status: ${error.message}`)
  }
}

/**
 * Get status badge color
 */
export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    case 'upcoming':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
    case 'archived':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
  }
}
