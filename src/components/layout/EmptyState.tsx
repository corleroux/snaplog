/**
 * EmptyState.tsx
 * --------------
 * Consistent empty state for all entity lists and zero-data screens.
 * The Capture Vendor empty state (icon + heading + CTA) is the reference
 * implementation — this component formalises that pattern.
 *
 * Rules (from DESIGN_SYSTEM.md):
 *   - Icon: 48px, text-muted, inside w-16 h-16 bg-surface-muted rounded-full
 *   - Heading: concise, action-oriented, text-base font-semibold
 *   - Supporting text: one sentence, max 2 lines, text-sm text-secondary
 *   - CTA: full-width orange button with + prefix and verb
 *   - Vertically centred in the available content area
 *
 * Usage — vendors list:
 *   <EmptyState
 *     icon={<Building2 />}
 *     heading="No vendors yet"
 *     description="Capture their business card or booth sign to extract information automatically."
 *     action={{ label: 'Add Your First Vendor', onPress: onNewVendor }}
 *   />
 *
 * Usage — search with no results:
 *   <EmptyState
 *     icon={<SearchX />}
 *     heading="No results found"
 *     description={`Nothing matched "${query}". Try a different search term.`}
 *     variant="search"
 *   />
 *
 * Usage — offline, no cached data:
 *   <EmptyState
 *     icon={<WifiOff />}
 *     heading="You're offline"
 *     description="Connect to the internet to load your events."
 *     variant="offline"
 *   />
 *
 * Usage — loading skeleton (prevents layout shift while data loads):
 *   <EmptyState loading />
 */

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmptyStateVariant =
  | 'default'    // standard list empty — orange-tinted icon bg
  | 'search'     // no search results — neutral icon bg
  | 'offline'    // no connectivity — neutral icon bg
  | 'error'      // failed to load — red-tinted icon bg

export interface EmptyStateAction {
  /** Button label — should start with a verb, e.g. "Add Your First Vendor" */
  label: string
  onPress: () => void
  /** Renders a + prefix before the label. Defaults to true. */
  showPlusPrefix?: boolean
}

export interface EmptyStateProps {
  /**
   * Icon to display — pass a Lucide icon or any React node.
   * Will be sized to 24px automatically via CSS.
   * Omit to show a generic placeholder.
   */
  icon?: React.ReactNode

  /** Short, action-oriented heading */
  heading?: string

  /** One supporting sentence, max 2 lines */
  description?: string

  /** Primary CTA button — omit for read-only empty states */
  action?: EmptyStateAction

  /**
   * Visual variant — affects icon background tint.
   * Defaults to 'default'.
   */
  variant?: EmptyStateVariant

  /**
   * Shows a loading skeleton instead of content.
   * Use while data is being fetched to prevent layout shift.
   */
  loading?: boolean

  /** Additional classes for the outer wrapper */
  className?: string

  /** Used by E2E tests */
  testId?: string
}

// ---------------------------------------------------------------------------
// Variant styles
// ---------------------------------------------------------------------------

const iconContainerVariants: Record<EmptyStateVariant, string> = {
  default: 'bg-orange-50 text-orange-400',
  search:  'bg-gray-100  text-gray-400',
  offline: 'bg-gray-100  text-gray-400',
  error:   'bg-red-50    text-red-400',
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function EmptyStateSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 px-8 animate-pulse">
      {/* Icon placeholder */}
      <div className="w-16 h-16 rounded-full bg-gray-100" />
      {/* Heading placeholder */}
      <div className="h-4 w-36 rounded-full bg-gray-100" />
      {/* Description placeholder */}
      <div className="flex flex-col items-center gap-2 w-full">
        <div className="h-3 w-56 rounded-full bg-gray-100" />
        <div className="h-3 w-44 rounded-full bg-gray-100" />
      </div>
      {/* Button placeholder */}
      <div className="h-11 w-full rounded-xl bg-gray-100 mt-2" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  heading,
  description,
  action,
  variant = 'default',
  loading = false,
  className,
  testId,
}: EmptyStateProps) {
  if (loading) {
    return <EmptyStateSkeleton />
  }

  const showPlusPrefix = action?.showPlusPrefix ?? true

  return (
    <div
      data-testid={testId}
      className={cn(
        // Centre vertically and horizontally in whatever space is available
        'flex flex-col items-center justify-center',
        'flex-1',                    // grows to fill parent flex container
        'gap-3',
        'py-16 px-8',
        'text-center',
        className,
      )}
    >
      {/* ── Icon ── */}
      {icon && (
        <div
          className={cn(
            'w-16 h-16',
            'rounded-full',
            'flex items-center justify-center',
            'flex-shrink-0',
            // Size all child SVGs to 24px
            '[&>svg]:w-6 [&>svg]:h-6',
            iconContainerVariants[variant],
          )}
        >
          {icon}
        </div>
      )}

      {/* ── Text block ── */}
      {(heading || description) && (
        <div className="flex flex-col items-center gap-1.5 max-w-[280px]">
          {heading && (
            <h2 className="text-base font-semibold text-gray-900 leading-snug">
              {heading}
            </h2>
          )}
          {description && (
            <p className="text-sm text-gray-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* ── CTA button ── */}
      {action && (
        <Button
          onClick={action.onPress}
          variant="accent"
          className={cn(
            // Full-width per DESIGN_SYSTEM.md Section 9
            'w-full',
            // Height meets 44px touch target
            'h-11',
            'mt-2',
            // Rounded-xl per button spec (Section 11)
            'rounded-xl',
          )}
        >
          {showPlusPrefix && (
            <span aria-hidden="true" className="text-base leading-none">+</span>
          )}
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default EmptyState
