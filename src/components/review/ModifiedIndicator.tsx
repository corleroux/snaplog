/**
 * Modified Field Indicator Component
 *
 * Shows when a field has been modified from its original value
 * with a revert button.
 */

import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ModifiedIndicatorProps {
  /** Callback when reverting to original value */
  onRevert: () => void
  /** Whether the button is disabled */
  isDisabled?: boolean
}

/**
 * Modified field indicator badge with revert button
 */
export function ModifiedIndicator({ onRevert, isDisabled }: ModifiedIndicatorProps) {
  return (
    <button
      type="button"
      onClick={onRevert}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        'px-2 py-0.5 rounded-full',
        'bg-blue-50 dark:bg-blue-950/30',
        'text-blue-600 dark:text-blue-400',
        'border border-blue-200 dark:border-blue-900/50',
        'hover:bg-blue-100 dark:hover:bg-blue-950/50',
        'transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed'
      )}
      aria-label="Revert to original value"
    >
      <RotateCcw className="h-3 w-3" />
      Modified
    </button>
  )
}
