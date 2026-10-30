/**
 * useDraftSyncStatus - Hook for retrieving sync status of a draft.
 *
 * Queries the upload queue for items associated with a specific draft
 * and returns the aggregate sync status for UI indicators.
 *
 * Returns the highest priority status:
 * - failed: if any item failed
 * - uploading: if any item is uploading
 * - queued: if any item is queued
 * - synced: if all items are synced
 * - idle: if no queue items exist
 */

import { useState, useEffect } from 'react'
import { getUploadQueue } from '@/lib/offline/uploadQueue'
import type { QueueItemStatus } from '@/lib/offline/types'

export interface DraftSyncStatus {
  status: QueueItemStatus | 'idle'
  error: string | null
  hasItems: boolean
  itemCount: number
  isLoading: boolean
}

export function useDraftSyncStatus(draftId: string | null | undefined): DraftSyncStatus {
  const [state, setState] = useState<DraftSyncStatus>({
    status: 'idle',
    error: null,
    hasItems: false,
    itemCount: 0,
    isLoading: true,
  })

  useEffect(() => {
    if (!draftId) {
      setState({
        status: 'idle',
        error: null,
        hasItems: false,
        itemCount: 0,
        isLoading: false,
      })
      return
    }

    let isMounted = true
    const queue = getUploadQueue()

    const checkStatus = async () => {
      try {
        const items = await queue.getItemsForDraft(draftId)

        if (!isMounted) return

        if (items.length === 0) {
          setState({
            status: 'idle',
            error: null,
            hasItems: false,
            itemCount: 0,
            isLoading: false,
          })
          return
        }

        // Determine highest priority status
        // Priority: failed > uploading > queued > synced
        const hasFailed = items.some(item => item.status === 'failed')
        const hasUploading = items.some(item => item.status === 'uploading')
        const hasQueued = items.some(item => item.status === 'queued')

        let status: QueueItemStatus = 'synced'
        if (hasFailed) status = 'failed'
        else if (hasUploading) status = 'uploading'
        else if (hasQueued) status = 'queued'

        // Get error message from first failed item
        const failedItem = items.find(item => item.status === 'failed')
        const error = failedItem?.lastError || null

        setState({
          status,
          error,
          hasItems: true,
          itemCount: items.length,
          isLoading: false,
        })
      } catch (err) {
        if (!isMounted) return
        setState({
          status: 'idle',
          error: null,
          hasItems: false,
          itemCount: 0,
          isLoading: false,
        })
      }
    }

    checkStatus()

    // Poll for updates every 2 seconds when not idle/synced
    const interval = setInterval(() => {
      checkStatus()
    }, 2000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [draftId])

  return state
}
