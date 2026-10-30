/**
 * Global Overlay Provider
 *
 * Manages global overlay state for search, notifications, and profile menu.
 * These overlays are rendered once at the app root and can be toggled from
 * any screen via the BottomNavigation component.
 *
 * Usage:
 *   Wrap your app with <GlobalOverlayProvider>
 *   Use useGlobalOverlay() hook to access state and actions
 *   BottomNavigation automatically uses this context
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface GlobalOverlayState {
  /** Global search dialog open state */
  isSearchOpen: boolean
  /** Notification panel open state */
  isNotificationOpen: boolean
  /** Profile menu open state */
  isProfileMenuOpen: boolean
  /** Feedback overlay open state */
  isFeedbackOpen: boolean
}

interface GlobalOverlayActions {
  /** Toggle global search dialog */
  toggleSearch: (open?: boolean) => void
  /** Toggle notification panel */
  toggleNotifications: (open?: boolean) => void
  /** Toggle profile menu */
  toggleProfileMenu: (open?: boolean) => void
  /** Toggle feedback overlay */
  toggleFeedback: (open?: boolean) => void
  /** Close all overlays */
  closeAll: () => void
}

type GlobalOverlayContextValue = GlobalOverlayState & GlobalOverlayActions

const GlobalOverlayContext = createContext<GlobalOverlayContextValue | null>(null)

interface GlobalOverlayProviderProps {
  children: ReactNode
}

export function GlobalOverlayProvider({ children }: GlobalOverlayProviderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)

  const toggleSearch = useCallback((open?: boolean) => {
    setIsSearchOpen(prev => open !== undefined ? open : !prev)
    if (open === undefined || open === true) {
      setIsNotificationOpen(false)
      setIsProfileMenuOpen(false)
      setIsFeedbackOpen(false)
    }
  }, [])

  const toggleNotifications = useCallback((open?: boolean) => {
    setIsNotificationOpen(prev => open !== undefined ? open : !prev)
    if (open === undefined || open === true) {
      setIsSearchOpen(false)
      setIsProfileMenuOpen(false)
      setIsFeedbackOpen(false)
    }
  }, [])

  const toggleProfileMenu = useCallback((open?: boolean) => {
    setIsProfileMenuOpen(prev => open !== undefined ? open : !prev)
    if (open === undefined || open === true) {
      setIsSearchOpen(false)
      setIsNotificationOpen(false)
      setIsFeedbackOpen(false)
    }
  }, [])

  const toggleFeedback = useCallback((open?: boolean) => {
    setIsFeedbackOpen(prev => open !== undefined ? open : !prev)
    if (open === undefined || open === true) {
      setIsSearchOpen(false)
      setIsNotificationOpen(false)
      setIsProfileMenuOpen(false)
    }
  }, [])

  const closeAll = useCallback(() => {
    setIsSearchOpen(false)
    setIsNotificationOpen(false)
    setIsProfileMenuOpen(false)
    setIsFeedbackOpen(false)
  }, [])

  const value: GlobalOverlayContextValue = {
    isSearchOpen,
    isNotificationOpen,
    isProfileMenuOpen,
    isFeedbackOpen,
    toggleSearch,
    toggleNotifications,
    toggleProfileMenu,
    toggleFeedback,
    closeAll,
  }

  return (
    <GlobalOverlayContext.Provider value={value}>
      {children}
    </GlobalOverlayContext.Provider>
  )
}

/**
 * Hook to access global overlay state and actions
 *
 * @throws Error if used outside GlobalOverlayProvider
 */
export function useGlobalOverlay(): GlobalOverlayContextValue {
  const context = useContext(GlobalOverlayContext)
  if (!context) {
    throw new Error('useGlobalOverlay must be used within GlobalOverlayProvider')
  }
  return context
}
