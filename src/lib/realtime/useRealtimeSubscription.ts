/**
 * useRealtimeSubscription — low-level Supabase Realtime hook
 *
 * Subscribes to INSERT / UPDATE / DELETE events on a given table
 * and exposes each event as it arrives.  Automatically invalidates
 * the matching TanStack Query cache key so that list screens refresh.
 *
 * The subscription is cleaned up on unmount.
 */

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RealtimeEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Record<string, unknown>
  old: Record<string, unknown>
}

export interface RealtimeFilter {
  column: string
  value: string
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRealtimeSubscription(
  table: string,
  filter?: RealtimeFilter,
) {
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter
            ? `${filter.column}=eq.${filter.value}`
            : undefined,
        },
        (payload) => {
          const event: RealtimeEvent = {
            eventType: payload.eventType as RealtimeEvent['eventType'],
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          }
          setEvents((prev) => [...prev, event])

          // Invalidate related TanStack Query caches
          queryClient.invalidateQueries({ queryKey: [table] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter?.column, filter?.value, queryClient])

  return { events, clearEvents: () => setEvents([]) }
}
