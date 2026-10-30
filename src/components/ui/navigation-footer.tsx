/**
 * NavigationFooter — Sticky bottom navigation for mobile screens
 *
 * Provides context-aware navigation between key app sections:
 * - Dashboard (Home)
 * - Vendor list
 *
 * Visibility rules:
 * - Dashboard: No footer
 * - Vendor list/detail: Show Home only
 * - Style list/detail: Show Home + Vendors
 * - Create/edit pages: No footer (BottomActionBar takes precedence)
 *
 * Use this for list/detail screen navigation.
 * Do not use for form actions — use BottomActionBar instead.
 */

import * as React from 'react'
import { Home, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Link, useLocation } from 'react-router-dom'

export interface NavLink {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

export interface NavigationFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Navigation links to display */
  links: NavLink[]
}

export function NavigationFooter({
  links,
  className,
  ...props
}: NavigationFooterProps) {
  const location = useLocation()

  // Don't render if no links
  if (links.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom z-40',
        className,
      )}
      {...props}
    >
      <nav className="flex items-stretch">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.href

          return (
            <Link
              key={link.href}
              to={link.href}
              aria-label={isActive ? `${link.label} (current page)` : link.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-2 px-3 transition-colors',
                'min-h-[3.5rem]',
                'focus-visible:ring-2 focus-visible:ring-orange-500/30 focus-visible:outline-none',
                isActive
                  ? 'text-orange-500'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

/**
 * Hook to determine navigation links based on current route context
 *
 * @param eventId - Current event ID from route params
 * @param vendorId - Current vendor ID from route params (optional)
 * @returns Array of navigation links to display
 */
export function useNavigationLinks({
  eventId,
}: {
  eventId?: string
}): NavLink[] {
  const location = useLocation()

  // Dashboard: no footer
  if (location.pathname === '/' || location.pathname.startsWith('/events/new') || location.pathname.includes('/edit')) {
    return []
  }

  // Vendor section (list or detail): show Home only
  if (
    location.pathname.match(/\/events\/[^/]+\/vendors\/?$/) ||
    location.pathname.match(/\/events\/[^/]+\/vendors\/[^/]+\/?$/)
  ) {
    return [
      {
        label: 'Home',
        href: '/',
        icon: Home,
      },
    ]
  }

  // Style section (list or detail): show Home + Vendors
  if (location.pathname.includes('/styles')) {
    const links: NavLink[] = [
      {
        label: 'Home',
        href: '/',
        icon: Home,
      },
    ]

    // Add Vendors link if we have eventId
    if (eventId) {
      links.push({
        label: 'Vendors',
        href: `/events/${eventId}/vendors`,
        icon: Building2,
      })
    }

    return links
  }

  // Capture/new flows: no footer
  if (location.pathname.includes('/new/') || location.pathname.includes('/capture')) {
    return []
  }

  return []
}
