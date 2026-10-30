/**
 * PageHeader.tsx
 * --------------
 * Mandatory header for every screen in the app.
 * Fixed height, enforces title truncation, single action slot.
 *
 * Rules (from DESIGN_SYSTEM.md):
 *   - Fixed height h-14 (56px)
 *   - Title: one line, truncates — never wraps into the action area
 *   - Subtitle: one line, truncates
 *   - Back chevron: rendered only when onBack is provided
 *   - action: ONE element — a Button or icon button
 *   - No secondary actions in the header
 *   - Border bottom always present
 *
 * Usage — standard page:
 *   <PageHeader
 *     title="Events"
 *     subtitle="Trade fairs and exhibitions"
 *     action={<Button size="sm" onClick={onNew}>+ New Event</Button>}
 *   />
 *
 * Usage — drill-down with back:
 *   <PageHeader
 *     title={event.name}
 *     subtitle="Vendors"
 *     onBack={() => navigate(-1)}
 *     action={<Button size="sm" onClick={onNewVendor}>+ New Vendor</Button>}
 *   />
 *
 * Usage — modal header with close:
 *   <PageHeader
 *     title="Capture Vendor"
 *     subtitle="Step 1 of 3"
 *     onClose={onDismiss}
 *   />
 */

import React from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { cn } from '@/lib/utils'   // shadcn/ui utility — adjust path if needed

interface PageHeaderProps {
  /** Primary heading — truncates if too long, never wraps */
  title: string

  /** Optional secondary line — step indicator, entity count, context label */
  subtitle?: string

  /**
   * Renders a back chevron (←) on the left.
   * Mutually exclusive with onClose — use one or the other.
   */
  onBack?: () => void

  /**
   * Renders a close icon (×) on the right in place of action.
   * Use for modals and sheet flows. Mutually exclusive with action.
   */
  onClose?: () => void

  /**
   * Single primary action rendered on the right.
   * Typically a small Button or an icon button.
   * Not rendered when onClose is provided.
   */
  action?: React.ReactNode

  /** Additional classes for the outer header element */
  className?: string

  /**
   * Whether to render the bottom border.
   * Defaults to true. Set false for headers that sit above a progress bar
   * (the progress bar acts as the visual separator).
   */
  showBorder?: boolean
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  onClose,
  action,
  className,
  showBorder = true,
}: PageHeaderProps) {
  const hasLeftSlot = !!onBack
  const hasRightSlot = !!onClose || !!action

  return (
    <header
      className={cn(
        // Fixed height — never grows
        'h-14 min-h-[56px]',
        // Horizontal layout
        'flex items-center',
        'px-4 gap-3',
        // Visual separation
        showBorder && 'border-b border-gray-200',
        // Always on top of scrollable content
        'bg-white z-10',
        className,
      )}
    >
      {/* ── Left slot: back chevron ── */}
      {hasLeftSlot && (
        <button
          onClick={onBack}
          aria-label="Go back"
          className={cn(
            // 44x44px minimum touch target (DESIGN_SYSTEM.md rule)
            'flex-shrink-0 -ml-1',
            'w-11 h-11 flex items-center justify-center',
            'rounded-full',
            'text-gray-700',
            'hover:bg-gray-100 active:bg-gray-200',
            'transition-colors duration-150',
          )}
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2} />
        </button>
      )}

      {/* ── Centre: title + subtitle ── */}
      {/*
        flex-1 + min-w-0 is the critical combination.
        min-w-0 allows the flex child to shrink below its content size,
        which enables `truncate` to actually work inside a flex container.
        Without min-w-0, long titles push the action slot off-screen.
      */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h1
          className={cn(
            'text-xl font-bold text-gray-900',
            'truncate leading-tight',
          )}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* ── Right slot: action button or close icon ── */}
      {hasRightSlot && (
        <div className="flex-shrink-0">
          {onClose ? (
            /* Close button — used in modals/sheets */
            <button
              onClick={onClose}
              aria-label="Close"
              className={cn(
                'w-11 h-11 flex items-center justify-center',
                'rounded-full',
                'text-gray-500',
                'hover:bg-gray-100 active:bg-gray-200',
                'transition-colors duration-150',
              )}
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          ) : (
            /* Arbitrary action — Button, icon button, etc. */
            action
          )}
        </div>
      )}
    </header>
  )
}

export default PageHeader
