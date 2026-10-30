/**
 * SyncProgressIndicator Component
 *
 * Displays detailed sync progress including:
 * - Progress bar for current sync operation
 * - Items remaining count
 * - Success/error feedback
 * - Retry failed items button
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getSyncEngine } from '@/lib/offline/syncEngine'
import { getUploadQueue } from '@/lib/offline/uploadQueue'
import type { QueueItem } from '@/lib/offline/types'

interface SyncProgressIndicatorProps {
  /** Optional className for styling */
  className?: string
  /** Show detailed breakdown */
  detailed?: boolean
  /** Callback when sync completes */
  onSyncComplete?: (results: { success: number; failed: number }) => void
}

interface SyncStatus {
  isActive: boolean
  currentItem: string | null
  totalQueued: number
  totalFailed: number
  totalSynced: number
  queueItems: QueueItem[]
}

export function SyncProgressIndicator({
  className,
  detailed = false,
  onSyncComplete,
}: SyncProgressIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus>({
    isActive: false,
    currentItem: null,
    totalQueued: 0,
    totalFailed: 0,
    totalSynced: 0,
    queueItems: [],
  })
  const [previousStatus, setPreviousStatus] = useState<SyncStatus | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const syncEngine = getSyncEngine()
    const queue = getUploadQueue()

    const updateStatus = async () => {
      const allItems = await queue.getAll()
      const queued = allItems.filter(item => item.status === 'queued').length
      const failed = allItems.filter(item => item.status === 'failed').length
      const synced = allItems.filter(item => item.status === 'synced').length

      const newStatus: SyncStatus = {
        isActive: syncEngine.isActive(),
        currentItem: syncEngine.getCurrentItemId(),
        totalQueued: queued,
        totalFailed: failed,
        totalSynced: synced,
        queueItems: allItems,
      }

      setStatus(newStatus)

      // Detect sync completion
      if (previousStatus?.isActive && !newStatus.isActive) {
        const successCount = newStatus.totalSynced - (previousStatus?.totalSynced ?? 0)
        const failedCount = newStatus.totalFailed
        onSyncComplete?.({ success: successCount, failed: failedCount })
      }

      setPreviousStatus(newStatus)
    }

    // Initial update
    updateStatus()

    // Update periodically
    const interval = setInterval(updateStatus, 500)

    return () => clearInterval(interval)
  }, [previousStatus, onSyncComplete])

  const totalItems = status.totalQueued + status.totalSynced + status.totalFailed
  const progress = totalItems > 0 ? (status.totalSynced / totalItems) * 100 : 0

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      const syncEngine = getSyncEngine()
      await syncEngine.retryFailed()
    } finally {
      setIsRetrying(false)
    }
  }

  const handleSyncAll = async () => {
    setIsRetrying(true)
    try {
      const syncEngine = getSyncEngine()
      await syncEngine.processQueued()
    } finally {
      setIsRetrying(false)
    }
  }

  // Don't show anything if no items and not active
  if (totalItems === 0 && !status.isActive) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
          {status.isActive && (
            <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {totalItems > 0 && (
          <div className="space-y-2">
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {status.totalSynced} of {totalItems} synced
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>
        )}

        {/* Status Summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span>{status.totalSynced} synced</span>
          </div>
          {status.totalQueued > 0 && (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>{status.totalQueued} pending</span>
            </div>
          )}
          {status.totalFailed > 0 && (
            <div className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-destructive" />
              <span>{status.totalFailed} failed</span>
            </div>
          )}
        </div>

        {/* Current Item */}
        {status.isActive && status.currentItem && detailed && (
          <div className="text-xs text-muted-foreground">
            Processing: {status.currentItem.slice(0, 8)}...
          </div>
        )}

        {/* Action Buttons */}
        {(status.totalQueued > 0 || status.totalFailed > 0) && !status.isActive && (
          <div className="flex gap-2">
            {status.totalQueued > 0 && (
              <Button
                size="sm"
                variant="default"
                onClick={handleSyncAll}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  `Sync ${status.totalQueued} item${status.totalQueued > 1 ? 's' : ''}`
                )}
              </Button>
            )}
            {status.totalFailed > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Retrying...
                  </>
                ) : (
                  `Retry ${status.totalFailed} failed`
                )}
              </Button>
            )}
          </div>
        )}

        {/* Detailed Item List */}
        {detailed && status.queueItems.length > 0 && (
          <div className="space-y-1 text-xs">
            {status.queueItems.map(item => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between py-1 px-2 rounded',
                  item.status === 'synced' && 'bg-green-50 text-green-700',
                  item.status === 'failed' && 'bg-red-50 text-red-700',
                  item.status === 'queued' && 'bg-amber-50 text-amber-700',
                  item.status === 'uploading' && 'bg-blue-50 text-blue-700'
                )}
              >
                <span className="truncate flex-1">{item.type}</span>
                <span className="ml-2 capitalize">{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Compact sync status badge for use in headers.
 */
export function SyncStatusBadge({ className }: { className?: string }) {
  const [count, setCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const updateCount = async () => {
      const queue = getUploadQueue()
      const items = await queue.getAll()
      const pending = items.filter(
        item => item.status === 'queued' || item.status === 'uploading' || item.status === 'failed'
      ).length
      setCount(pending)

      const syncEngine = getSyncEngine()
      setSyncing(syncEngine.isActive())
    }

    updateCount()
    const interval = setInterval(updateCount, 1000)

    return () => clearInterval(interval)
  }, [])

  if (count === 0 && !syncing) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        'bg-blue-600 text-white',
        syncing && 'animate-pulse',
        className
      )}
    >
      {syncing ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <span>{count}</span>
          <span>pending</span>
        </>
      )}
    </div>
  )
}
