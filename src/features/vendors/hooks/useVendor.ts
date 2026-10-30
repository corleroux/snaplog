import { useEffect, useState } from 'react'
import type { Vendor } from '@/lib/supabase/types'
import { getVendor } from '../api/getVendor'

export interface VendorState {
  vendor: Vendor | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch and manage a single vendor.
 *
 * Responsibilities:
 * - Fetch vendor by ID
 * - Manage loading state
 * - Manage error state
 * - Provide refresh function
 *
 * @param vendorId - The vendor ID
 *
 * @deprecated Use `useVendorQuery(id)` from `useVendorQueries` instead.
 * TanStack Query provides automatic caching, background refetching, and stale-time control.
 */
export function useVendor(vendorId: string): VendorState {
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchVendor = async () => {
    if (!vendorId) {
      setVendor(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await getVendor(vendorId)
      setVendor(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch vendor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendor()
  }, [vendorId])

  return {
    vendor,
    loading,
    error,
    refresh: fetchVendor,
  }
}
