/**
 * Pull to Refresh Component
 *
 * Provides pull-to-refresh functionality for scrollable content areas.
 * Detects downward pull gesture and triggers a refresh callback.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  disabled?: boolean
  threshold?: number // px pull distance to trigger refresh
  maxPull?: number // px maximum pull distance
  loadingComponent?: React.ReactNode
  className?: string
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  maxPull = 150,
  loadingComponent,
  className = '',
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)

  const startY = useRef(0)
  const currentY = useRef(0)

  // Check if container is at top
  const isAtTop = useCallback(() => {
    if (!contentRef.current) return false
    return contentRef.current.scrollTop === 0
  }, [])

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return

    startY.current = e.touches[0].clientY

    // Only enable pull if we're at the top
    if (isAtTop()) {
      setIsPulling(true)
    }
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return

    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - startY.current

    // Only respond to downward pull
    if (deltaY > 0) {
      // Apply resistance to the pull
      const resistance = 0.4
      const pullDistance = Math.min(deltaY * resistance, maxPull)
      setPullDistance(pullDistance)

      // Prevent default scroll behavior
      if (isAtTop()) {
        e.preventDefault()
      }
    }
  }

  // Handle touch end
  const handleTouchEnd = async () => {
    if (!isPulling) return

    setIsPulling(false)

    // Trigger refresh if threshold exceeded
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      setPullDistance(threshold)

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Reset pull distance with animation
      setPullDistance(0)
    }
  }

  // Reset pull distance on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPulling) {
        setIsPulling(false)
        setPullDistance(0)
      }
    }

    if (isPulling) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPulling])

  // Calculate pull progress (0 to 1)
  const pullProgress = Math.min(pullDistance / threshold, 1)

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${Math.max(0, pullDistance - 40)}px)`,
          opacity: pullProgress,
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {isRefreshing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Refreshing...</span>
            </>
          ) : loadingComponent ? (
            loadingComponent
          ) : (
            <>
              <RefreshCw
                className="h-5 w-5"
                style={{
                  transform: `rotate(${pullProgress * 270}deg)`,
                  transition: isPulling ? 'none' : 'transform 0.2s ease-out',
                }}
              />
              <span className="text-sm">
                {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="h-full overflow-y-auto"
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}

/**
 * Hook for pull-to-refresh state
 */
export function usePullToRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const refresh = useCallback(async (refreshFn: () => Promise<void> | void) => {
    setIsRefreshing(true)
    try {
      await refreshFn()
      setLastRefresh(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  return { isRefreshing, lastRefresh, refresh }
}
