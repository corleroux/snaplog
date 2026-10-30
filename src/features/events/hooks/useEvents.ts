import { useEffect, useState } from 'react'
import type { Event } from '@/lib/supabase/types'
import { getEvents } from '../api/getEvents'

export interface EventsState {
  events: Event[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch and manage events for the authenticated user.
 *
 * Responsibilities:
 * - Fetch events on mount
 * - Manage loading state
 * - Manage error state
 * - Provide refresh function
 *
 * @deprecated Use `useEventsQuery()` from `useEventQueries` instead.
 * TanStack Query provides automatic caching, background refetching, and stale-time control.
 */
export function useEvents(): EventsState {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getEvents()
      setEvents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  return {
    events,
    loading,
    error,
    refresh: fetchEvents,
  }
}
