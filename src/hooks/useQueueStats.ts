/**
 * useQueueStats - Hook for retrieving overall upload queue statistics.
 *
 * Returns aggregate statistics about all items in the upload queue
 * for global sync indicators (e.g., in feed screens).
 *
 * Refreshes every 2 seconds when there are active items.
 */

import { useState, useEffect } from 'react'
import { getUploadQueue } from '@/lib/offline/uploadQueue'

export interface QueueStats {
  queued: number
  uploading: number
  failed: number
  synced: number
  total: number
  hasFailed: boolean
  hasUploading: boolean
  hasQueued: boolean
  isLoading: boolean
}

export function useQueueStats(): QueueStats {
  const [state, setState] = useState<QueueStats>({
    queued: 0,
    uploading: 0,
    failed: 0,
    synced: 0,
    total: 0,
    hasFailed: false,
    hasUploading: false,
    hasQueued: false,
    isLoading: true,
  })

  useEffect(() => {
    let isMounted = true
    const queue = getUploadQueue()

    const checkStats = async () => {
      try {
        const stats = await queue.getStats()

        if (!isMounted) return

        const total = stats.queued + stats.uploading + stats.failed + stats.synced

        setState({
          ...stats,
          total,
          hasFailed: stats.failed > 0,
          hasUploading: stats.uploading > 0,
          hasQueued: stats.queued > 0,
          isLoading: false,
        })
      } catch (err) {
        if (!isMounted) return
        setState({
          queued: 0,
          uploading: 0,
          failed: 0,
          synced: 0,
          total: 0,
          hasFailed: false,
          hasUploading: false,
          hasQueued: false,
          isLoading: false,
        })
      }
    }

    checkStats()

    // Poll less frequently when idle
    const interval = setInterval(() => {
      checkStats()
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return state
}
