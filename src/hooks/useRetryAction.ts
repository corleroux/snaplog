/**
 * useRetryAction - Hook for retrying failed queue items.
 *
 * Provides a simple interface for retrying failed operations
 * associated with a draft. Handles:
 * - Finding failed items for a draft
 * - Triggering retry via sync engine
 * - Managing retry state (isRetrying, error, success)
 * - Callback on completion
 *
 * Usage:
 * ```tsx
 * const { retry, isRetrying, error, canRetry } = useRetryAction(draftId, {
 *   onSuccess: () => navigate('/success'),
 *   onError: (err) => console.error(err),
 * })
 *
 * <RetryButton onRetry={retry} isRetrying={isRetrying} disabled={!canRetry} />
 * ```
 */

import { useState, useCallback, useEffect } from 'react'
import { getUploadQueue } from '@/lib/offline/uploadQueue'
import { getSyncEngine } from '@/lib/offline/syncEngine'
import type { QueueItem } from '@/lib/offline/types'
import { createLogger } from '@/lib/logger'

const logger = createLogger('RetryAction')

export interface RetryActionState {
  /** Whether a retry operation is in progress */
  isRetrying: boolean
  /** Whether retry is available (has failed items) */
  canRetry: boolean
  /** Number of failed items */
  failedCount: number
  /** Highest retry count among failed items */
  maxRetryCount: number
  /** Error from last retry attempt */
  error: string | null
  /** Whether last retry was successful */
  success: boolean
}

export interface RetryActionOptions {
  /** Callback when retry succeeds */
  onSuccess?: (results: QueueItem[]) => void
  /** Callback when retry fails */
  onError?: (error: string) => void
  /** Whether to auto-retry when hook mounts (default: false) */
  autoRetry?: boolean
}

export function useRetryAction(
  draftId: string | null | undefined,
  options: RetryActionOptions = {}
): RetryActionState & { retry: () => Promise<void> } {
  const { onSuccess, onError, autoRetry: _autoRetry = false } = options

  const [state, setState] = useState<RetryActionState>({
    isRetrying: false,
    canRetry: false,
    failedCount: 0,
    maxRetryCount: 0,
    error: null,
    success: false,
  })

  // Check for failed items
  const checkFailedItems = useCallback(async () => {
    if (!draftId) {
      setState({
        isRetrying: false,
        canRetry: false,
        failedCount: 0,
        maxRetryCount: 0,
        error: null,
        success: false,
      })
      return
    }

    try {
      const queue = getUploadQueue()
      const items = await queue.getItemsForDraft(draftId)
      const failedItems = items.filter(item => item.status === 'failed')

      const maxRetryCount = failedItems.reduce(
        (max, item) => Math.max(max, item.retryCount),
        0
      )

      setState(prev => ({
        ...prev,
        canRetry: failedItems.length > 0,
        failedCount: failedItems.length,
        maxRetryCount,
        isRetrying: false,
      }))
    } catch (err) {
      logger.error('Failed to check queue items', { error: String(err) })
    }
  }, [draftId])

  // Initial check and polling
  useEffect(() => {
    checkFailedItems()

    // Poll for changes every 3 seconds
    const interval = setInterval(checkFailedItems, 3000)
    return () => clearInterval(interval)
  }, [checkFailedItems])

  // Retry function
  const retry = useCallback(async () => {
    if (!draftId || state.isRetrying) {
      return
    }

    setState(prev => ({
      ...prev,
      isRetrying: true,
      error: null,
      success: false,
    }))

    try {
      const engine = getSyncEngine()
      const queue = getUploadQueue()

      // Get failed items before retry
      const itemsBefore = await queue.getItemsForDraft(draftId)
      const failedItemsBefore = itemsBefore.filter(item => item.status === 'failed')

      if (failedItemsBefore.length === 0) {
        setState(prev => ({
          ...prev,
          isRetrying: false,
          canRetry: false,
        }))
        return
      }

      // Process all draft items (will reset failed items and retry them)
      const results = await engine.processDraftItems(draftId)

      // Check results
      const hasFailure = results.some(r => !r.success)

      if (hasFailure) {
        const errorMessage = results.find(r => !r.success)?.error || 'Retry failed'
        setState(prev => ({
          ...prev,
          isRetrying: false,
          error: errorMessage,
          success: false,
        }))
        onError?.(errorMessage)
      } else {
        setState(prev => ({
          ...prev,
          isRetrying: false,
          canRetry: false,
          error: null,
          success: true,
        }))

        // Get updated items for callback
        const itemsAfter = await queue.getItemsForDraft(draftId)
        onSuccess?.(itemsAfter)
      }

      // Refresh failed count
      await checkFailedItems()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry failed'
      setState(prev => ({
        ...prev,
        isRetrying: false,
        error: errorMessage,
        success: false,
      }))
      onError?.(errorMessage)
    }
  }, [draftId, state.isRetrying, checkFailedItems, onSuccess, onError])

  return {
    retry,
    ...state,
  }
}

/**
 * Simplified hook for retrying a specific queue item by ID.
 *
 * Use this when you have a specific queue item ID instead of a draft ID.
 */
export function useRetryItem(
  queueItemId: string | null | undefined,
  options: RetryActionOptions = {}
): {
  retry: () => Promise<void>
  isRetrying: boolean
  canRetry: boolean
  retryCount: number
  error: string | null
  success: boolean
} {
  const [item, setItem] = useState<QueueItem | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Load item
  useEffect(() => {
    if (!queueItemId) {
      setItem(null)
      return
    }

    const loadItem = async () => {
      try {
        const queue = getUploadQueue()
        const loaded = await queue.get(queueItemId)
        setItem(loaded ?? null)
      } catch (err) {
        logger.error('Failed to load queue item', { queueItemId, error: String(err) })
      }
    }

    loadItem()
  }, [queueItemId])

  // Poll for item updates
  useEffect(() => {
    if (!queueItemId) return

    const interval = setInterval(async () => {
      try {
        const queue = getUploadQueue()
        const loaded = await queue.get(queueItemId)
        setItem(loaded ?? null)
      } catch {
        logger.debug('Poll error for queue item', { queueItemId })
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [queueItemId])

  const retry = useCallback(async () => {
    if (!queueItemId || isRetrying) {
      return
    }

    setIsRetrying(true)
    setError(null)
    setSuccess(false)

    try {
      const engine = getSyncEngine()
      const result = await engine.retryItem(queueItemId)

      if (result.success) {
        setSuccess(true)
        options.onSuccess?.([])
      } else {
        setError(result.error || 'Retry failed')
        options.onError?.(result.error || 'Retry failed')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Retry failed'
      setError(errorMessage)
      options.onError?.(errorMessage)
    } finally {
      setIsRetrying(false)
    }
  }, [queueItemId, isRetrying, options])

  return {
    retry,
    isRetrying,
    canRetry: item?.status === 'failed',
    retryCount: item?.retryCount ?? 0,
    error,
    success,
  }
}
