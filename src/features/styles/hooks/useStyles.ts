import { useEffect, useState } from 'react'
import type { FabricStyle } from '@/lib/supabase/types'
import { getStyles } from '../api/getStyles'

export interface StylesState {
  styles: FabricStyle[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch and manage fabric styles for a specific vendor.
 *
 * Responsibilities:
 * - Fetch styles for the given event and vendor IDs on mount
 * - Manage loading state
 * - Manage error state
 * - Provide refresh function
 *
 * @param eventId - The event ID
 * @param vendorId - The vendor ID
 *
 * @deprecated Use `useStylesQuery(vendorId)` from `useStyleQueries` instead.
 * TanStack Query provides automatic caching, background refetching, and stale-time control.
 */
export function useStyles(eventId: string, vendorId: string): StylesState {
  const [styles, setStyles] = useState<FabricStyle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStyles = async () => {
    if (!eventId || !vendorId) {
      setStyles([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getStyles(eventId, vendorId)
      setStyles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch styles')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStyles()
  }, [eventId, vendorId])

  return {
    styles,
    loading,
    error,
    refresh: fetchStyles,
  }
}
