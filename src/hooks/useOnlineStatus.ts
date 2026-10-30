/**
 * useOnlineStatus - Hook for browser online/offline status awareness.
 *
 * Exposes the current browser online/offline status for UI messaging.
 * Listens to browser online/offline events and updates reactively.
 *
 * Usage:
 *   const { isOnline, isOffline } = useOnlineStatus()
 *
 * Returns:
 * - isOnline: true if browser is online
 * - isOffline: true if browser is offline (convenience alias)
 */

import { useState, useEffect } from 'react'

export interface OnlineStatus {
  isOnline: boolean
  isOffline: boolean
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() => {
    // Initialize from navigator if available
    if (typeof navigator !== 'undefined') {
      return navigator.onLine
    }
    return true
  })

  useEffect(() => {
    // Skip if navigator not available (SSR)
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
  }
}
