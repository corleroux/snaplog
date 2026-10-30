import { useEffect, useState } from 'react'
import type { FabricStyleDetail } from '@/lib/supabase/types'
import { getStyleDetail } from '../api/getStyleDetail'

export interface StyleDetailState {
  data: FabricStyleDetail | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Hook to fetch and manage complete fabric style detail.
 *
 * Responsibilities:
 * - Fetch style detail including variants, inventory, prices, and images
 * - Manage loading state
 * - Manage error state
 * - Provide refresh function
 *
 * @param styleId - The fabric style ID
 *
 * @deprecated Use `useStyleQuery(id)` from `useStyleQueries` instead.
 * TanStack Query provides automatic caching, background refetching, and stale-time control.
 */
export function useStyleDetail(styleId: string): StyleDetailState {
  const [data, setData] = useState<FabricStyleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetail = async () => {
    if (!styleId) {
      setData(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await getStyleDetail(styleId)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch style detail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [styleId])

  return {
    data,
    loading,
    error,
    refresh: fetchDetail,
  }
}
