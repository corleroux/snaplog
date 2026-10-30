import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

/**
 * AppFrame — Primary application container
 *
 * COMPONENT_BREAKDOWN.md §1.1:
 * "Primary application container for mobile-first screens."
 *
 * Responsibilities:
 * - safe-area spacing
 * - page background
 * - vertical layout structure
 * - consistent max-width
 * - bottom navigation / action region compatibility
 */

const frameVariants = cva('min-h-screen bg-background', {
  variants: {
    /** Whether the frame provides its own scroll container */
    scroll: {
      true: '',
      false: '',
    },
  },
  defaultVariants: {
    scroll: false,
  },
})

export interface AppFrameProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof frameVariants> {
  children: React.ReactNode
}

/**
 * AppFrame wraps a full screen.
 *
 * Use this as the root element for every screen instead of
 * inventing `min-h-screen bg-background` + container classes each time.
 *
 * It constrains the content to `max-w-md mx-auto` (mobile-first)
 * and handles safe-area insets.
 */
export function AppFrame({
  children,
  className,
  scroll,
  ...props
}: AppFrameProps) {
  return (
    <div className={cn(frameVariants({ scroll }), className)} {...props}>
      {children}
    </div>
  )
}

/**
 * AppFrameContent — Centered content area inside an AppFrame.
 *
 * Provides `max-w-md mx-auto px-4` and safe-area top padding.
 * Use this for list screens and detail screens.
 */
export function AppFrameContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('container max-w-md mx-auto px-4 py-6 pt-safe-top', className)}
      {...props}
    >
      {children}
    </div>
  )
}
