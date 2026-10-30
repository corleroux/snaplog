/**
 * useRealtimeRefresh — convenience hook for list screens
 *
 * Subscribes to all changes on a table and invalidates the provided
 * TanStack Query cache keys so that list data is automatically refreshed.
 *
 * Use this in list screen wrappers instead of the lower-level
 * useRealtimeSubscription when you only need cache invalidation
 * (no raw event access required).
 */

import { useEffect, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

import type { RealtimeFilter } from './useRealtimeSubscription'

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRealtimeRefresh(
  table: string,
  queryKeys: string[][],
  filter?: RealtimeFilter,
) {
  const queryClient = useQueryClient()

  // Keep a ref to the latest queryKeys so the callback always uses the
  // current value without re-creating the subscription on every render.
  const queryKeysRef = useRef(queryKeys)
  queryKeysRef.current = queryKeys

  // Stabilise the dependency — only change when the serialised form changes.
  const serialisedKeys = useMemo(
    () => JSON.stringify(queryKeys),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(queryKeys)],
  )

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-refresh`)
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
        () => {
          for (const key of queryKeysRef.current) {
            queryClient.invalidateQueries({ queryKey: key })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter?.column, filter?.value, queryClient, serialisedKeys])
}
