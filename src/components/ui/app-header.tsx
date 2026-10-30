/**
 * AppHeader — Standardized top header for internal screens
 *
 * COMPONENT_BREAKDOWN.md §1.2:
 * "Standardized top header for internal screens."
 *
 * Responsibilities:
 * - page title
 * - back action when required
 * - optional right-side actions
 * - optional subtitle / context label
 *
 * Use this as the ONLY way to render sticky headers.
 * Do not invent `sticky top-0 z-10 bg-background/95` inline.
 */

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const headerVariants = cva('sticky top-0 z-10', {
  variants: {
    variant: {
      default: 'bg-background/95 backdrop-blur-sm border-b border-border',
      transparent: 'bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export interface AppHeaderProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {
  /** Page title displayed in the center */
  title: string
  /** Optional subtitle below the title */
  subtitle?: string
  /** Back button click handler. Renders a back arrow when provided. */
  onBack?: () => void
  /** Custom back element (e.g. Link with dirty guard). Overrides onBack. */
  backAction?: React.ReactNode
  /** Optional right-side action slot */
  rightAction?: React.ReactNode
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  backAction,
  rightAction,
  variant,
  className,
  ...props
}: AppHeaderProps) {
  const hasBack = onBack || backAction

  return (
    <header className={cn(headerVariants({ variant }), className)} {...props}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: back button or spacer */}
        {hasBack ? (
          backAction ?? (
            <button
              type="button"
              onClick={onBack}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )
        ) : (
          <div className="h-9 w-9" />
        )}

        {/* Center: title + subtitle */}
        <div className="flex-1 text-center min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {/* Right: action or spacer */}
        {rightAction ? (
          <div className="flex items-center gap-2 flex-shrink-0">{rightAction}</div>
        ) : (
          <div className="h-9 w-9" />
        )}
      </div>
    </header>
  )
}
