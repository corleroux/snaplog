/**
 * OfflineIndicator Component
 *
 * Displays a banner when the device is offline, showing:
 * - Current online/offline status
 * - Number of pending items waiting to sync
 * - Visual indicator (color/icon) for status
 */

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { getSyncEngine } from '@/lib/offline/syncEngine'
import { getUploadQueue } from '@/lib/offline/uploadQueue'

interface OfflineIndicatorProps {
  /** Optional className for styling */
  className?: string
  /** Position of the indicator */
  position?: 'top' | 'bottom'
}

export function OfflineIndicator({ className, position = 'top' }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    // Update online status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial count
    updatePendingCount()

    // Update pending count periodically
    const interval = setInterval(updatePendingCount, 2000)

    // Listen for sync engine changes
    const syncEngine = getSyncEngine()
    const checkSyncStatus = () => {
      setSyncing(syncEngine.isActive())
    }

    // Check sync status periodically
    const syncInterval = setInterval(checkSyncStatus, 500)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
      clearInterval(syncInterval)
    }
  }, [])

  const updatePendingCount = async () => {
    const queue = getUploadQueue()
    const items = await queue.getAll()
    const pending = items.filter(
      item => item.status === 'queued' || item.status === 'uploading' || item.status === 'failed'
    ).length
    setPendingCount(pending)
  }

  // Don't show anything if online with no pending items
  if (isOnline && pendingCount === 0 && !syncing) {
    return null
  }

  const isTop = position === 'top'

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 px-4 py-2 text-sm font-medium',
        'flex items-center justify-center gap-2',
        'transition-all duration-300',
        isTop ? 'top-0' : 'bottom-0',
        // Background colors
        !isOnline && 'bg-destructive text-destructive-foreground',
        isOnline && syncing && 'bg-blue-600 text-white',
        isOnline && !syncing && pendingCount > 0 && 'bg-amber-500 text-white',
        className
      )}
    >
      {/* Status Icon */}
      {!isOnline && <WifiOff className="w-4 h-4" />}
      {isOnline && syncing && <AlertCircle className="w-4 h-4 animate-pulse" />}
      {isOnline && !syncing && pendingCount > 0 && <Wifi className="w-4 h-4" />}

      {/* Status Message */}
      <span className="truncate">
        {!isOnline && 'You are offline. Changes will sync when connected.'}
        {isOnline && syncing && `Syncing... (${pendingCount} remaining)`}
        {isOnline && !syncing && pendingCount > 0 && `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting to sync`}
      </span>
    </div>
  )
}

/**
 * Compact offline indicator for use in headers or navigation bars.
 */
export function OfflineStatusBadge({ className }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    updatePendingCount()
    const interval = setInterval(updatePendingCount, 2000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  const updatePendingCount = async () => {
    const queue = getUploadQueue()
    const items = await queue.getAll()
    const pending = items.filter(
      item => item.status === 'queued' || item.status === 'uploading' || item.status === 'failed'
    ).length
    setPendingCount(pending)
  }

  // Don't show if online with no pending items
  if (isOnline && pendingCount === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        !isOnline && 'bg-destructive/10 text-destructive',
        isOnline && pendingCount > 0 && 'bg-amber-500/10 text-amber-600',
        className
      )}
    >
      {!isOnline && <WifiOff className="w-3 h-3" />}
      {isOnline && <Wifi className="w-3 h-3" />}
      <span>
        {!isOnline && 'Offline'}
        {isOnline && pendingCount > 0 && pendingCount}
      </span>
    </div>
  )
}
