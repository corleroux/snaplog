/**
 * BottomNavigation -- Fixed bottom tab bar with centre FAB (cutout hump design)
 *
 * Design System Section 10 (Bottom Navigation):
 * - Fixed at bottom of the 430px shell (content scrolls under)
 * - Height: 72px (nav bar) + FAB protrudes ~28px above
 * - Active state: text-brand (orange-500) icon + label
 * - Inactive state: text-muted (gray-400) icon + label
 * - Icon size: 24px (h-6 w-6)
 * - Label: text-[10px]
 * - Touch target per item: minimum 44px height
 * - Nav items: [Home] [Events] [FAB +] [Search] [Profile]
 * - Centre FAB replaces Notifications; notifications moved to header bell icon
 * - SVG cutout hump shape with matching border trace
 *
 * Visibility rules:
 * - Shown on: Events dashboard, Vendor list, Style list, Detail screens
 * - Hidden on: Capture flows, Create/Edit modals, Auth screens
 *
 * Global Overlays:
 * - Search and Profile actions use GlobalOverlayProvider
 * - If provider is available, callbacks are optional (backward compatible)
 * - If provider is not available, callbacks must be provided (legacy mode)
 *
 * Import from: @/components/layout/BottomNavigation
 */

import { useLocation, useNavigate } from 'react-router-dom'
import { Home, CalendarDays, Search, User, Plus, MessageSquare, LogOut, Settings, Shield } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useGlobalOverlay } from './GlobalOverlayProvider'
import { useAuth, signOut, useProfileRole } from '@/features/auth'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  isAction?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Events', href: '/events', icon: CalendarDays },
  // Centre slot is reserved for FAB — no nav item here
  { label: 'Search', href: '#search', icon: Search, isAction: true },
  { label: 'Profile', href: '#profile', icon: User, isAction: true },
]

interface BottomNavigationProps {
  /** Called when the centre FAB (+) button is pressed */
  onAddPress?: () => void
  /**
   * @deprecated Use GlobalOverlayProvider instead.
   */
  onSearchPress?: () => void
  /**
   * @deprecated Use GlobalOverlayProvider instead.
   */
  onProfilePress?: () => void
  /** Additional className for the outer container */
  className?: string
}

// SVG viewBox width for the nav bar shape
const VB_W = 430
const VB_H = 72

// Hump geometry — tweak these to adjust the curve shape
const HUMP_CENTER = VB_W / 2        // 215
const HUMP_HALF_BASE = 76           // how wide the hump base is on each side
const HUMP_DEPTH = 28               // how far down the hump dips into the bar
const HUMP_CTRL = 18                // bezier control point offset for smoothness

const LEFT_END = HUMP_CENTER - HUMP_HALF_BASE   // 139
const RIGHT_START = HUMP_CENTER + HUMP_HALF_BASE // 291

// SVG path: flat left → smooth bezier down into hump → smooth bezier back up → flat right
const NAV_PATH = [
  `M0,0`,
  `L${LEFT_END},0`,
  `C${LEFT_END + HUMP_CTRL},0 ${HUMP_CENTER - HUMP_CTRL},${HUMP_DEPTH} ${HUMP_CENTER},${HUMP_DEPTH}`,
  `C${HUMP_CENTER + HUMP_CTRL},${HUMP_DEPTH} ${RIGHT_START - HUMP_CTRL},0 ${RIGHT_START},0`,
  `L${VB_W},0`,
  `L${VB_W},${VB_H}`,
  `L0,${VB_H}`,
  `Z`,
].join(' ')

// Border trace — same curve, 0.5px stroke, no fill
const BORDER_PATH = [
  `M0,0.5`,
  `L${LEFT_END},0.5`,
  `C${LEFT_END + HUMP_CTRL},0.5 ${HUMP_CENTER - HUMP_CTRL},${HUMP_DEPTH + 0.5} ${HUMP_CENTER},${HUMP_DEPTH + 0.5}`,
  `C${HUMP_CENTER + HUMP_CTRL},${HUMP_DEPTH + 0.5} ${RIGHT_START - HUMP_CTRL},0.5 ${RIGHT_START},0.5`,
  `L${VB_W},0.5`,
].join(' ')

export function BottomNavigation({
  onAddPress,
  onSearchPress,
  onProfilePress,
  className,
}: BottomNavigationProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const { user } = useAuth()
  const { isAdmin } = useProfileRole()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch {
      // signOut updates auth state which triggers redirect via RequireAuth
    }
    globalOverlay?.toggleProfileMenu(false)
  }

  let globalOverlay: ReturnType<typeof useGlobalOverlay> | null = null
  try {
    globalOverlay = useGlobalOverlay()
  } catch {
    // Context not available, fall back to callback props
  }

  const handleItemClick = (item: NavItem) => {
    if (item.isAction) {
      if (item.href === '#search') {
        globalOverlay ? globalOverlay.toggleSearch() : onSearchPress?.()
      } else if (item.href === '#profile') {
        globalOverlay ? globalOverlay.toggleProfileMenu() : onProfilePress?.()
      }
      return
    }
    navigate(item.href)
  }

  const isActive = (item: NavItem): boolean => {
    if (item.isAction) return false
    if (item.label === 'Home') return pathname === '/'
    if (item.label === 'Events') return pathname.startsWith('/events')
    return pathname.startsWith(item.href)
  }

  // FAB sits HUMP_DEPTH px above the top of the nav bar
  // We give the container extra top padding so the FAB isn't clipped
  const FAB_PROTRUSION = HUMP_DEPTH // 28px above the bar top

  return (
    <div
      className={cn('mt-auto w-full z-nav relative', className)}
      style={{ paddingTop: FAB_PROTRUSION }}
    >
      {/* SVG background shape */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: FAB_PROTRUSION,
          left: 0,
          right: 0,
          width: '100%',
          height: VB_H,
          filter: 'drop-shadow(0 -2px 4px rgba(0,0,0,0.08))',
          display: 'block',
        }}
      >
        {/* White fill with hump cutout */}
        <path d={NAV_PATH} className="fill-white dark:fill-gray-900" />
        {/* Border trace */}
        <path
          d={BORDER_PATH}
          fill="none"
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth="0.5"
        />
      </svg>

      {/* Nav content row */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{ position: 'relative', height: VB_H }}
      >
        <ul className="flex items-start justify-around h-full pt-2">

          {/* Left two items: Home, Events */}
          {NAV_ITEMS.slice(0, 2).map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <li key={item.label} className="flex-1">
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'w-full flex flex-col items-center justify-center gap-0.5',
                    'h-14 transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:ring-offset-1',
                    active
                      ? 'text-orange-500'
                      : 'text-gray-400 hover:text-gray-500 active:text-gray-600',
                  )}
                  aria-label={active ? `${item.label} (current)` : item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </button>
              </li>
            )
          })}

          {/* Centre FAB slot */}
          <li className="flex-1 flex items-start justify-center" style={{ paddingTop: 0 }}>
            <button
              type="button"
              onClick={onAddPress}
              aria-label="Add new item"
              style={{
                marginTop: -(FAB_PROTRUSION + 4),
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#E8611A',
                border: '3px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(232,97,26,0.45), 0 1px 4px rgba(0,0,0,0.12)',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              className="transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
            >
              <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
            </button>
          </li>

          {/* Right two items: Search, Profile */}
          {NAV_ITEMS.slice(2).map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <li key={item.label} className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'w-full flex flex-col items-center justify-center gap-0.5',
                    'h-14 transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:ring-offset-1',
                    active
                      ? 'text-orange-500'
                      : 'text-gray-400 hover:text-gray-500 active:text-gray-600',
                  )}
                  aria-label={active ? `${item.label} (current)` : item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </button>

                {/* Profile menu — anchored directly above the Profile button */}
                {item.label === 'Profile' && globalOverlay?.isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => globalOverlay.toggleProfileMenu(false)} />
                    <div className={cn(
                      'absolute bottom-full right-0 mb-2 z-50',
                      'w-56',
                      'rounded-xl',
                      'border border-gray-200',
                      'bg-white',
                      'shadow-lg shadow-black/10',
                      'overflow-hidden',
                      'py-1',
                    )}>
                      <div className="px-3 py-2.5 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.email}
                        </p>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            globalOverlay?.toggleProfileMenu(false)
                            navigate('/admin')
                          }}
                          className={cn(
                            'w-full flex items-center gap-2',
                            'px-3 py-2.5',
                            'text-sm text-left',
                            'text-gray-700',
                            'hover:bg-gray-50 active:bg-gray-100',
                            'transition-colors duration-100',
                          )}
                        >
                          <Shield className="h-4 w-4" />
                          Admin
                        </button>
                      )}
                      <button
                        onClick={() => {
                          globalOverlay?.toggleProfileMenu(false)
                          navigate('/settings')
                        }}
                        className={cn(
                          'w-full flex items-center gap-2',
                          'px-3 py-2.5',
                          'text-sm text-left',
                          'text-gray-700',
                          'hover:bg-gray-50 active:bg-gray-100',
                          'transition-colors duration-100',
                        )}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                      <button
                        onClick={handleSignOut}
                        className={cn(
                          'w-full flex items-center gap-2',
                          'px-3 py-2.5',
                          'text-sm text-left',
                          'text-red-600',
                          'hover:bg-red-50 active:bg-red-100',
                          'transition-colors duration-100',
                        )}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </li>
            )
          })}

        </ul>

        {/* Feedback icon — centered in nav bar, always visible */}
        <button
          type="button"
          onClick={() => globalOverlay?.toggleFeedback()}
          aria-label="Send feedback"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: 6,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            background: 'transparent',
          }}
          className="transition-colors duration-150 text-blue-500 hover:text-blue-600 active:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
        >
          <MessageSquare className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </nav>
    </div>
  )
}

export default BottomNavigation
