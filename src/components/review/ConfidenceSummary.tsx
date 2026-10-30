/**
 * ConfidenceSummary Component
 *
 * Displays an at-a-glance overview of AI confidence across all fields.
 * Shows counts of low/medium/high confidence fields and provides quick navigation.
 *
 * Features:
 * - Count of fields by confidence level
 * - "X fields need attention" message for low confidence
 * - Click to navigate to problematic fields (optional)
 * - Visual representation of confidence distribution
 */

import { useMemo } from 'react'
import { Check, AlertTriangle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionContainer } from '@/components/ui/section-container'
import type { ConfidenceLevel, ConfidenceSummaryDisplayProps } from '@/types/review'

/**
 * Confidence threshold values
 */
const CONFIDENCE_THRESHOLDS = {
  high: 0.8,
  medium: 0.5,
} as const

/**
 * Get confidence level from numeric score
 */
function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.high) return 'high'
  if (score >= CONFIDENCE_THRESHOLDS.medium) return 'medium'
  return 'low'
}

/**
 * Calculate confidence summary from scores
 */
function calculateSummary(
  confidenceScores: Record<string, number>
): { high: number; medium: number; low: number; total: number } {
  const summary = {
    high: 0,
    medium: 0,
    low: 0,
    total: Object.keys(confidenceScores).length,
  }

  for (const score of Object.values(confidenceScores)) {
    const level = getConfidenceLevel(score)
    summary[level]++
  }

  return summary
}

/**
 * Confidence bar component showing visual distribution
 */
function ConfidenceBar({
  summary,
}: {
  summary: { high: number; medium: number; low: number; total: number }
}) {
  if (summary.total === 0) return null

  const highPercent = (summary.high / summary.total) * 100
  const mediumPercent = (summary.medium / summary.total) * 100
  const lowPercent = (summary.low / summary.total) * 100

  return (
    <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
      {summary.high > 0 && (
        <div
          className="bg-green-500"
          style={{ width: `${highPercent}%` }}
          aria-label={`${summary.high} high confidence fields`}
        />
      )}
      {summary.medium > 0 && (
        <div
          className="bg-amber-500"
          style={{ width: `${mediumPercent}%` }}
          aria-label={`${summary.medium} medium confidence fields`}
        />
      )}
      {summary.low > 0 && (
        <div
          className="bg-red-500"
          style={{ width: `${lowPercent}%` }}
          aria-label={`${summary.low} low confidence fields`}
        />
      )}
    </div>
  )
}

/**
 * Confidence stat item
 */
function ConfidenceStat({
  count,
  label,
  color,
  icon: Icon,
  onClick,
}: {
  count: number
  label: string
  color: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
}) {
  if (count === 0) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'hover:bg-muted/50 transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        onClick && 'cursor-pointer'
      )}
      disabled={!onClick}
    >
      <div className={cn('p-1.5 rounded-full', color)}>
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="text-left">
        <div className="text-lg font-semibold leading-none">{count}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </button>
  )
}

/**
 * Main ConfidenceSummary component
 */
export function ConfidenceSummary({
  confidenceScores,
  onFieldClick,
  className,
}: ConfidenceSummaryDisplayProps) {
  // Calculate summary
  const summary = useMemo(
    () => calculateSummary(confidenceScores),
    [confidenceScores]
  )

  // Get low confidence fields for quick navigation
  const lowConfidenceFields = useMemo(() => {
    return Object.entries(confidenceScores)
      .filter(([_, score]) => score < CONFIDENCE_THRESHOLDS.medium)
      .map(([field, _]) => field)
  }, [confidenceScores])

  const hasLowConfidence = summary.low > 0
  const hasAnyConfidence = summary.total > 0

  // If no confidence data, don't render
  if (!hasAnyConfidence) {
    return null
  }

  return (
    <SectionContainer
      title="Confidence Overview"
      description={
        hasLowConfidence
          ? `${summary.low} field${summary.low > 1 ? 's' : ''} need${summary.low > 1 ? '' : 's'} attention`
          : 'All fields have good confidence'
      }
      background={hasLowConfidence ? 'muted' : 'none'}
      className={className}
    >
      {/* Confidence bar visualization */}
      <div className="mb-4">
        <ConfidenceBar summary={summary} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <ConfidenceStat
          count={summary.high}
          label="High"
          color="bg-green-500"
          icon={Check}
          onClick={
            onFieldClick
              ? () => {
                  // Navigate to first high confidence field (if needed)
                  // This could scroll to the first high confidence field
                }
              : undefined
          }
        />
        <ConfidenceStat
          count={summary.medium}
          label="Medium"
          color="bg-amber-500"
          icon={AlertTriangle}
          onClick={
            onFieldClick
              ? () => {
                  // Navigate to first medium confidence field
                  const mediumFields = Object.entries(confidenceScores)
                    .filter(([_, score]) => {
                      const s = score
                      return (
                        s >= CONFIDENCE_THRESHOLDS.medium &&
                        s < CONFIDENCE_THRESHOLDS.high
                      )
                    })
                    .map(([field, _]) => field)
                  if (mediumFields[0]) {
                    onFieldClick(mediumFields[0])
                  }
                }
              : undefined
          }
        />
        <ConfidenceStat
          count={summary.low}
          label="Needs Review"
          color="bg-red-500"
          icon={AlertCircle}
          onClick={
            onFieldClick && lowConfidenceFields.length > 0
              ? () => {
                  // Navigate to first low confidence field
                  onFieldClick(lowConfidenceFields[0])
                }
              : undefined
          }
        />
      </div>

      {/* Low confidence fields list */}
      {hasLowConfidence && lowConfidenceFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Fields to review:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lowConfidenceFields.map((field) => (
              <Badge
                key={field}
                variant="outline"
                className={cn(
                  'cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30',
                  'border-red-200 dark:border-red-900/50',
                  'text-red-700 dark:text-red-400'
                )}
                onClick={() => onFieldClick?.(field)}
              >
                {field}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {hasLowConfidence && onFieldClick && lowConfidenceFields.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onFieldClick(lowConfidenceFields[0])}
            className="w-full"
          >
            Review First Low Confidence Field
          </Button>
        </div>
      )}
    </SectionContainer>
  )
}

/**
 * Compact version for inline display
 */
export interface ConfidenceSummaryCompactProps {
  confidenceScores: Record<string, number>
  className?: string
}

export function ConfidenceSummaryCompact({
  confidenceScores,
  className,
}: ConfidenceSummaryCompactProps) {
  const summary = useMemo(
    () => calculateSummary(confidenceScores),
    [confidenceScores]
  )

  const hasLowConfidence = summary.low > 0
  const hasAnyConfidence = summary.total > 0

  if (!hasAnyConfidence) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {summary.low > 0 && (
        <Badge
          variant="outline"
          className={cn(
            'gap-1',
            'bg-red-50 dark:bg-red-950/30',
            'border-red-200 dark:border-red-900/50',
            'text-red-700 dark:text-red-400'
          )}
        >
          <AlertCircle className="h-3 w-3" />
          {summary.low} need review
        </Badge>
      )}
      {summary.medium > 0 && (
        <Badge
          variant="outline"
          className={cn(
            'gap-1',
            'bg-amber-50 dark:bg-amber-950/30',
            'border-amber-200 dark:border-amber-900/50',
            'text-amber-700 dark:text-amber-400'
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          {summary.medium} uncertain
        </Badge>
      )}
      {summary.high > 0 && !hasLowConfidence && (
        <Badge
          variant="outline"
          className={cn(
            'gap-1',
            'bg-green-50 dark:bg-green-950/30',
            'border-green-200 dark:border-green-900/50',
            'text-green-700 dark:text-green-400'
          )}
        >
          <Check className="h-3 w-3" />
          All good
        </Badge>
      )}
    </div>
  )
}

// Export the getConfidenceLevel helper for use in other components
export { getConfidenceLevel }
