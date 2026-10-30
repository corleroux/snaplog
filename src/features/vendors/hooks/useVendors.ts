import { useEffect, useState } from 'react'
import type { Vendor } from '@/lib/supabase/types'
import { getVendors } from '../api/getVendors'

export interface VendorsState {
  vendors: Vendor[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch and manage vendors for a specific event.
 *
 * Responsibilities:
 * - Fetch vendors for the given event ID on mount
 * - Manage loading state
 * - Manage error state
 * - Provide refresh function
 *
 * @param eventId - The event ID to fetch vendors for
 *
 * @deprecated Use `useVendorsQuery(eventId)` from `useVendorQueries` instead.
 * TanStack Query provides automatic caching, background refetching, and stale-time control.
 */
export function useVendors(eventId: string): VendorsState {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVendors = async () => {
    if (!eventId) {
      setVendors([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getVendors(eventId)
      setVendors(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [eventId])

  return {
    vendors,
    loading,
    error,
    refresh: fetchVendors,
  }
}
