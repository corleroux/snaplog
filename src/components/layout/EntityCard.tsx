/**
 * EntityCard.tsx
 * --------------
 * Unified list card for all entity types: Events, Vendors, Styles, Variants.
 * Enforces icon-only actions via an overflow menu — no text actions on the
 * card surface.
 *
 * Rules (from DESIGN_SYSTEM.md):
 *   - Background: white, rounded-xl, border border-gray-200
 *   - Title:    one line, truncates, font-semibold
 *   - Subtitle: one line, truncates, text-secondary
 *   - Badge:    status only, one per card maximum
 *   - Actions:  icon-only via MoreVertical overflow menu (bottom sheet style)
 *   - Touch target for overflow trigger: minimum 44x44px
 *
 * Usage — Event card:
 *   <EntityCard
 *     title={event.name}
 *     subtitle={`${event.location} · ${formattedDate}`}
 *     badge={{ label: 'Upcoming', variant: 'upcoming' }}
 *     onPress={() => navigate(`/events/${event.id}`)}
 *     actions={[
 *       { label: 'Edit',   icon: <Pencil />,   onPress: onEdit },
 *       { label: 'Share',  icon: <Share2 />,   onPress: onShare },
 *       { label: 'Export', icon: <Download />, onPress: onExport },
 *       { label: 'Delete', icon: <Trash2 />,   onPress: onDelete, destructive: true },
 *     ]}
 *   />
 *
 * Usage — Vendor card with leading icon:
 *   <EntityCard
 *     title={vendor.company}
 *     subtitle={`Booth ${vendor.booth}`}
 *     leadingIcon={<Building2 className="w-5 h-5" />}
 *     badge={{ label: 'Active', variant: 'active' }}
 *     onPress={() => navigate(`/vendors/${vendor.id}`)}
 *     actions={[...]}
 *   />
 *
 * Usage — no actions (read-only card):
 *   <EntityCard
 *     title={style.name}
 *     subtitle={style.composition}
 *     onPress={onPress}
 *   />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeVariant = 'upcoming' | 'active' | 'archived' | 'draft' | 'error'

export interface CardAction {
  /** Display label shown in the action menu */
  label: string
  /** Icon rendered left of the label in the menu — 18x18px recommended */
  icon: React.ReactNode
  /** Called when the action is tapped */
  onPress: () => void
  /** Renders the action in destructive (red) styling */
  destructive?: boolean
  /** Prevents the action from being triggered — renders greyed out */
  disabled?: boolean
}

export interface EntityCardProps {
  /** Primary text — truncates, never wraps */
  title: string
  /** Secondary text — truncates, never wraps */
  subtitle?: string
  /**
   * Optional icon rendered in a circle on the left.
   * Use for entity-type visual differentiation.
   */
  leadingIcon?: React.ReactNode
  /** Single status badge */
  badge?: {
    label: string
    variant: BadgeVariant
  }
  /** Optional count chip (e.g. "3 styles") — neutral pill, distinct from the status badge */
  countChip?: string
  /**
   * Overflow menu actions.
   * Rendered in order. Destructive actions should go last, after a divider.
   * If omitted, the overflow trigger is not rendered.
   */
  actions?: CardAction[]
  /**
   * Called when the card body (not the overflow button) is tapped.
   * Renders a right chevron affordance when provided.
   */
  onPress?: () => void
  /** Additional classes for the outer card element */
  className?: string
  /** Used by E2E tests */
  testId?: string
}

// ---------------------------------------------------------------------------
// Badge styles
// ---------------------------------------------------------------------------

const badgeStyles: Record<BadgeVariant, string> = {
  upcoming: 'bg-blue-50   text-blue-700',
  active:   'bg-green-50  text-green-700',
  archived: 'bg-gray-100  text-gray-500',
  draft:    'bg-orange-50 text-orange-700',
  error:    'bg-red-50    text-red-600',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ label, variant }: { label: string; variant: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center',
        'text-xs font-medium',
        'px-2 py-0.5 rounded-full',
        'whitespace-nowrap flex-shrink-0',
        badgeStyles[variant],
      )}
    >
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Action menu (bottom-sheet style dropdown - Portal-based to escape overflow:hidden)
// ---------------------------------------------------------------------------

interface ActionMenuProps {
  actions: CardAction[]
  onClose: () => void
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

function ActionMenu({ actions, onClose, triggerRef }: ActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, right: 0 })

  // Calculate menu position based on trigger button location
  const updatePosition = useCallback(() => {
    if (triggerRef?.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 4, // 4px gap below button
        right: window.innerWidth - rect.right, // Distance from right edge
      })
    }
  }, [triggerRef])

  // Update position on mount and window resize
  useEffect(() => {
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [updatePosition])

  // Close on outside click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      const target = e.target as Node
      // Close if click is outside menu and outside trigger button
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose()
      }
    }
    // Small delay so the same click that opened the menu doesn't close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick)
    }, 50)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [onClose, triggerRef])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Separate standard and destructive actions
  const standardActions = actions.filter(a => !a.destructive)
  const destructiveActions = actions.filter(a => a.destructive)

  // Render menu via Portal to escape any overflow:hidden containers
  return createPortal(
    <>
      {/* Backdrop — transparent, closes menu on tap */}
      <div
        className="fixed inset-0 z-40"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Menu panel - positioned fixed based on trigger location */}
      <div
        ref={menuRef}
        role="menu"
        aria-label="Card actions"
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          right: `${position.right}px`,
          zIndex: 50,
          animation: 'slideInFromRight 100ms ease-out',
        }}
        className={cn(
          'w-48',
          'bg-white rounded-xl',
          'border border-gray-200',
          'shadow-lg shadow-black/10',
          'overflow-hidden',
        )}
      >
        {/* Standard actions */}
        {standardActions.map((action, i) => (
          <ActionMenuItem
            key={i}
            action={action}
            onClose={onClose}
          />
        ))}

        {/* Divider before destructive actions */}
        {destructiveActions.length > 0 && standardActions.length > 0 && (
          <div className="border-t border-gray-200 my-0.5" />
        )}

        {/* Destructive actions */}
        {destructiveActions.map((action, i) => (
          <ActionMenuItem
            key={`d-${i}`}
            action={action}
            onClose={onClose}
          />
        ))}
      </div>
    </>,
    document.body
  )
}

function ActionMenuItem({
  action,
  onClose,
}: {
  action: CardAction
  onClose: () => void
}) {
  return (
    <button
      role="menuitem"
      disabled={action.disabled}
      onClick={() => {
        if (!action.disabled) {
          action.onPress()
          onClose()
        }
      }}
      className={cn(
        'w-full flex items-center gap-3',
        'px-4 py-3',
        'text-sm text-left',
        'transition-colors duration-100',
        action.destructive
          ? 'text-red-600 hover:bg-red-50 active:bg-red-100'
          : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100',
        action.disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      {/* Icon wrapper — normalises to 18px */}
      <span className="w-[18px] h-[18px] flex items-center justify-center flex-shrink-0 [&>svg]:w-[18px] [&>svg]:h-[18px]">
        {action.icon}
      </span>
      <span>{action.label}</span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// EntityCard
// ---------------------------------------------------------------------------

export function EntityCard({
  title,
  subtitle,
  leadingIcon,
  badge,
  countChip,
  actions,
  onPress,
  className,
  testId,
}: EntityCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hasActions = actions && actions.length > 0
  const isNavigable = !!onPress

  return (
    <div
      className={cn(
        'bg-white rounded-xl',
        'border border-gray-200',
        'flex items-center',
        className,
      )}
      data-testid={testId}
    >
      {/* ── Card body (tappable) ── */}
      <div
        role={isNavigable ? 'button' : undefined}
        tabIndex={isNavigable ? 0 : undefined}
        aria-label={isNavigable ? `Open ${title}` : undefined}
        onClick={isNavigable ? onPress : undefined}
        onKeyDown={isNavigable
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') onPress?.() }
          : undefined
        }
        className={cn(
          'flex items-center gap-3',
          'flex-1 min-w-0',               // min-w-0 enables truncation
          'p-4',
          isNavigable && [
            'cursor-pointer',
            'hover:bg-gray-50 active:bg-gray-100',
            'transition-colors duration-150',
            'rounded-l-xl',               // only left corners when overflow button present
            !hasActions && 'rounded-xl',
          ],
          !isNavigable && 'rounded-xl',
        )}
      >
        {/* Leading icon */}
        {leadingIcon && (
          <div className={cn(
            'flex-shrink-0',
            'w-10 h-10',
            'rounded-full bg-orange-50',
            'flex items-center justify-center',
            'text-orange-600',
            '[&>svg]:w-5 [&>svg]:h-5',
          )}>
            {leadingIcon}
          </div>
        )}

        {/* Text block */}
        <div className="flex-1 min-w-0">
          {/* Title row: title + badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {title}
            </span>
            {badge && (
              <StatusBadge label={badge.label} variant={badge.variant} />
            )}
            {countChip && (
              <span className="inline-flex items-center text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                {countChip}
              </span>
            )}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right chevron — only when navigable and no overflow menu */}
        {isNavigable && !hasActions && (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* ── Overflow action trigger ── */}
      {hasActions && (
        <div className="flex-shrink-0 pr-1">
          <button
            ref={triggerRef}
            aria-label={`Actions for ${title}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(prev => !prev)
            }}
            className={cn(
              // 44x44px touch target (DESIGN_SYSTEM.md)
              'w-11 h-11',
              'flex items-center justify-center',
              'rounded-full',
              'text-gray-400',
              'hover:bg-gray-100 active:bg-gray-200',
              'hover:text-gray-600',
              'transition-colors duration-150',
            )}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Action menu — rendered via Portal to escape overflow:hidden */}
          {menuOpen && (
            <ActionMenu
              actions={actions}
              onClose={() => setMenuOpen(false)}
              triggerRef={triggerRef}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default EntityCard
