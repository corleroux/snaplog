/**
 * Confidence Indicator Component
 *
 * Displays AI confidence level with visual indicators.
 * Used across review and capture screens.
 */

import { Check, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import type { ConfidenceLevel } from '@/types/review'

export interface ConfidenceIndicatorProps {
  /** AI confidence level */
  level?: ConfidenceLevel
  /** Whether to show compact version (icon only) */
  compact?: boolean
}

const confidenceConfig = {
  high: {
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900/50',
    label: 'High',
    icon: Check,
  },
  medium: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900/50',
    label: 'Medium',
    icon: AlertTriangle,
  },
  low: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900/50',
    label: 'Low',
    icon: AlertTriangle,
  },
} as const satisfies Record<ConfidenceLevel, {
  color: string
  bg: string
  border: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}>

/**
 * Confidence indicator badge component
 */
export function ConfidenceIndicator({ level, compact = false }: ConfidenceIndicatorProps) {
  if (!level) return null

  const config = confidenceConfig[level]
  const Icon = config.icon

  if (compact) {
    return (
      <div
        className={cn(
          'flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
          config.bg,
          config.border,
          'border'
        )}
        aria-label={`Confidence: ${config.label}`}
      >
        <Icon className={cn('h-3 w-3', config.color)} />
      </div>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 text-xs font-normal',
        config.bg,
        config.color,
        config.border
      )}
      aria-label={`Confidence: ${config.label}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}
