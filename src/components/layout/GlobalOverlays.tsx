/**
 * Global Overlays Component
 *
 * Renders the global search, notification panel, and feedback overlays.
 * Profile menu is rendered inside BottomNavigation, anchored to the Profile button.
 * These are rendered once at the app root and controlled by GlobalOverlayProvider.
 *
 * This component should be rendered inside GlobalOverlayProvider, typically
 * near the root of the app (e.g., in App.tsx after QueryProvider).
 */

import { useEffect } from 'react'
import { GlobalSearch } from '@/features/search'
import { NotificationCenter } from '@/features/notifications'
import { FeedbackOverlay } from '@/features/feedback'
import { useGlobalOverlay } from './GlobalOverlayProvider'

export function GlobalOverlays() {
  const { isSearchOpen, isNotificationOpen, isFeedbackOpen, toggleSearch, toggleNotifications, toggleProfileMenu, toggleFeedback } = useGlobalOverlay()

  // Close all overlays on route change
  useEffect(() => {
    const closeAll = () => {
      toggleSearch(false)
      toggleNotifications(false)
      toggleProfileMenu(false)
      toggleFeedback(false)
    }

    // Listen for route changes
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function (...args) {
      originalPushState.apply(history, args)
      closeAll()
    }

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args)
      closeAll()
    }

    // Also close on popstate (back/forward buttons)
    window.addEventListener('popstate', closeAll)

    return () => {
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      window.removeEventListener('popstate', closeAll)
    }
  }, [toggleSearch, toggleNotifications, toggleProfileMenu, toggleFeedback])

  return (
    <>
      {/* ── Global Search Dialog ── */}
      <GlobalSearch
        isOpen={isSearchOpen}
        onOpenChange={toggleSearch}
      />

      {/* ── Feedback Overlay ── */}
      <FeedbackOverlay
        isOpen={isFeedbackOpen}
        onClose={() => toggleFeedback(false)}
      />

      {/* ── Notification Panel (anchored above notifications tab in bottom nav) ── */}
      {isNotificationOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => toggleNotifications(false)}
          />
          <div className="absolute right-0 bottom-16 z-50 w-80 sm:w-96 bg-background border border-border rounded-lg shadow-lg max-h-[80vh] overflow-hidden flex flex-col">
            <NotificationCenter onClose={() => toggleNotifications(false)} />
          </div>
        </>
      )}

    </>
  )
}
