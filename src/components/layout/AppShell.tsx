/**
 * AppShell.tsx
 * ------------
 * Root layout wrapper for every route in the app.
 * Constrains the UI to a 430px mobile frame, centred on larger screens.
 * This is the ONLY place max-width is set in the entire project.
 *
 * Usage:
 *   Every page component wraps its content in <AppShell>.
 *   AppShell does not render PageHeader or BottomNav — those are
 *   composed inside each page so screens have full control.
 *
 * Example:
 *   <AppShell>
 *     <PageHeader title="Events" action={<NewEventButton />} />
 *     <main className="flex-1 overflow-y-auto px-4 pt-4">
 *       {children}
 *     </main>
 *     <BottomNav />
 *   </AppShell>
 *
 * Layout behavior:
 *   - The shell is always h-screen, ensuring BottomNavigation stays at viewport bottom
 *   - Content area uses flex-1 to grow and fill available space
 *   - Content scrolls independently while header and bottom nav remain fixed
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface AppShellProps {
  /** Page content — PageHeader, main, BottomNav etc. */
  children: React.ReactNode
  /**
   * Background colour of the outer frame visible on desktop/tablet.
   * Defaults to neutral-100. Pass 'transparent' to remove it.
   */
  outerBackground?: string
}

export function AppShell({
  children,
  outerBackground = 'bg-neutral-100',
}: AppShellProps) {
  return (
    /* Outer frame — fills the full viewport, visible on desktop as the
       neutral surround around the phone-sized shell */
    <div className={cn('min-h-screen flex items-start justify-center', outerBackground)}>

      {/* Inner shell — the 430px phone-sized container */}
      <div
        className={cn(
          'relative',
          'w-full max-w-[430px]',   // hard mobile cap — never exceeded
          'h-screen',                // always full viewport height for bottom nav positioning
          'bg-white',
          'pt-2',
          'flex flex-col',           // column layout for header/content/footer
          // Shadow gives the "phone on a desk" feel on larger screens
          // Uses shadow-xl per DESIGN_SYSTEM.md -- no responsive breakpoints
          'shadow-xl',
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default AppShell
