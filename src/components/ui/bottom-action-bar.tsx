/**
 * BottomActionBar — Sticky bottom action zone for mobile screens
 *
 * COMPONENT_BREAKDOWN.md §1.3:
 * "Sticky bottom action zone for mobile screens."
 *
 * Responsibilities:
 * - holds primary and secondary actions
 * - maintains safe-area spacing
 * - keeps critical CTAs reachable by thumb
 *
 * Use this as the ONLY way to render sticky bottom action bars.
 * Do not invent `sticky bottom-0 bg-background/95` inline.
 *
 * Usage:
 * <BottomActionBar>
 *   <Button variant="outline" radius="pill" className="flex-1">Cancel</Button>
 *   <Button variant="accent" radius="pill" className="flex-1">Save</Button>
 * </BottomActionBar>
 */

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface BottomActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function BottomActionBar({
  children,
  className,
  ...props
}: BottomActionBarProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 safe-area-bottom',
        className,
      )}
      {...props}
    >
      <div className="flex gap-3">
        {children}
      </div>
    </div>
  )
}
