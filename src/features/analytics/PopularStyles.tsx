/**
 * Popular Styles Component
 *
 * Displays a list of most popular styles based on views and exports.
 * Shows popularity metrics and allows filtering by time range.
 */

import { useState, useEffect, useCallback } from 'react'
import { Eye, Download, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Link } from 'react-router-dom'
import { getPopularStyles, type PopularStyle, type TimeRange } from './api/popularity'

export interface PopularStylesProps {
  /** The event ID to get popular styles for */
  eventId: string
  /** Optional additional className */
  className?: string
}

const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
  { value: '1d', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All Time' },
]

/**
 * Popular styles list component
 *
 * Shows styles ranked by popularity score (views + exports * 5).
 * Displays view count, export count, and rank.
 */
export function PopularStyles({ eventId, className }: PopularStylesProps) {
  const [styles, setStyles] = useState<PopularStyle[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPopularStyles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPopularStyles(eventId, timeRange, 20)
      setStyles(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load popular styles'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [eventId, timeRange])

  useEffect(() => {
    loadPopularStyles()
  }, [loadPopularStyles])

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
    if (rank === 2) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    if (rank === 3) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Popular Styles</h3>
        </div>
        <div className="flex gap-1">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTimeRange(option.value)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                timeRange === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-8 text-center text-muted-foreground">
          Loading popular styles...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="py-8 text-center text-destructive">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && styles.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          No style activity yet
        </div>
      )}

      {/* Popular styles list */}
      {!loading && !error && styles.length > 0 && (
        <div className="space-y-2">
          {styles.map((style, index) => (
            <Link
              key={style.styleId}
              to={`/events/${eventId}/vendors/${style.vendorId}/styles/${style.styleId}`}
              className="block"
            >
              <div className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Rank badge */}
                  <div
                    className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                      getRankBadgeColor(index + 1)
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Style info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {style.styleName || 'Untitled Style'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {style.vendorName || 'Unknown Vendor'}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {/* Views */}
                    <div className="flex items-center gap-1" title="Views">
                      <Eye className="h-3.5 w-3.5" />
                      <span>{style.viewCount}</span>
                    </div>

                    {/* Exports */}
                    <div className="flex items-center gap-1" title="Exports">
                      <Download className="h-3.5 w-3.5" />
                      <span>{style.exportCount}</span>
                    </div>

                    {/* Popularity score */}
                    <div className="font-semibold text-primary" title="Popularity Score">
                      {style.popularityScore}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer note */}
      {!loading && !error && styles.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Popularity = Views + (Exports × 5)
        </p>
      )}
    </div>
  )
}
