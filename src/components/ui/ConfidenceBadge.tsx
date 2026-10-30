/**
 * ConfidenceBadge Component
 *
 * Displays extraction confidence as a small colored pill badge.
 * - null: renders nothing (manual entry, no badge)
 * - 0.8-1.0: green ("High") with percentage
 * - 0.5-0.8: amber ("Medium") with percentage
 * - 0-0.5: red ("Low") with percentage
 */

import { cn } from '@/lib/utils/cn'

export interface ConfidenceBadgeProps {
  /** Confidence value between 0 and 1, or null for manual entry */
  confidence: number | null
  /** Size variant: 'sm' for inline use, 'md' for section headers */
  size?: 'sm' | 'md'
}

function getConfidenceTier(confidence: number): {
  label: string
  colorClasses: string
} {
  if (confidence >= 0.8) {
    return {
      label: 'High',
      colorClasses: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    }
  }
  if (confidence >= 0.5) {
    return {
      label: 'Medium',
      colorClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    }
  }
  return {
    label: 'Low',
    colorClasses: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
}

export function ConfidenceBadge({ confidence, size = 'sm' }: ConfidenceBadgeProps) {
  if (confidence === null || confidence === undefined) {
    return null
  }

  const { label, colorClasses } = getConfidenceTier(confidence)
  const percentage = Math.round(confidence * 100)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        colorClasses,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
      )}
      title={`Extraction confidence: ${label} (${percentage}%)`}
    >
      {percentage}%
    </span>
  )
}
