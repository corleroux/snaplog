/**
 * Team Productivity Metrics Component
 *
 * Displays team productivity metrics including captures per user,
 * completion rate, and leaderboard.
 */

import { useState, useCallback, useMemo } from 'react'
import { Trophy, TrendingUp, Target, Users, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import type { UserProductivity, ProductivityTimeRange } from './api/teamProductivity'

export interface TeamProductivityProps {
  /** Event ID */
  eventId: string
  /** Productivity data for team members */
  productivityData: UserProductivity[]
  /** Optional additional className */
  className?: string
  /** Time range selector */
  timeRange?: ProductivityTimeRange
  /** Callback when time range changes */
  onTimeRangeChange?: (range: ProductivityTimeRange) => void
}

/**
 * Get rank icon for leaderboard
 */
function getRankIcon(rank: number) {
  const icons = [
    <span key="1" className="text-2xl">🥇</span>,
    <span key="2" className="text-2xl">🥈</span>,
    <span key="3" className="text-2xl">🥉</span>
  ]
  return icons[rank - 1] || <span className="text-lg text-muted-foreground w-8 text-center">{rank}</span>
}

/**
 * Get completion rate color
 */
function getCompletionRateColor(rate: number): string {
  if (rate >= 80) return 'text-green-600 dark:text-green-400'
  if (rate >= 50) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * Get completion rate variant
 */
function getCompletionRateVariant(rate: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (rate >= 80) return 'default'
  if (rate >= 50) return 'secondary'
  return 'destructive'
}

/**
 * Team Productivity Metrics Component
 *
 * Displays team productivity metrics with leaderboard.
 */
export function TeamProductivity({
  eventId: _eventId,
  productivityData,
  className,
  timeRange = 'week' as ProductivityTimeRange,
  onTimeRangeChange
}: TeamProductivityProps) {
  const [sortBy, setSortBy] = useState<'captures' | 'completion' | 'recent'>('captures')

  // Sort productivity data
  const sortedData = useMemo(() => {
    const sorted = [...productivityData].sort((a, b) => {
      switch (sortBy) {
        case 'captures':
          return b.totalCaptures - a.totalCaptures
        case 'completion':
          return b.completionRate - a.completionRate
        case 'recent':
          if (!a.lastCaptureAt && !b.lastCaptureAt) return 0
          if (!a.lastCaptureAt) return 1
          if (!b.lastCaptureAt) return -1
          return new Date(b.lastCaptureAt).getTime() - new Date(a.lastCaptureAt).getTime()
        default:
          return 0
      }
    })
    return sorted
  }, [productivityData, sortBy])

  // Calculate aggregate metrics
  const aggregateMetrics = useMemo(() => {
    const totalCaptures = productivityData.reduce((sum, p) => sum + p.totalCaptures, 0)
    const avgCompletionRate = productivityData.length > 0
      ? productivityData.reduce((sum, p) => sum + p.completionRate, 0) / productivityData.length
      : 0
    const activeUsers = productivityData.filter(p => p.lastCaptureAt).length

    return {
      totalCaptures,
      avgCompletionRate: Math.round(avgCompletionRate),
      activeUsers,
      totalUsers: productivityData.length
    }
  }, [productivityData])

  // Get top 3 users
  const topUsers = sortedData.slice(0, 3)

  const handleTimeRangeChange = useCallback((range: ProductivityTimeRange) => {
    onTimeRangeChange?.(range)
  }, [onTimeRangeChange])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with time range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Team Productivity</h3>
          <p className="text-sm text-muted-foreground">
            {aggregateMetrics.totalUsers} team member{aggregateMetrics.totalUsers !== 1 ? 's' : ''}
          </p>
        </div>
        {onTimeRangeChange && (
          <div className="flex gap-1">
            {(['today', 'week', 'month', 'all'] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => handleTimeRangeChange(range)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full transition-colors',
                  timeRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {range === 'all' ? 'All time' : range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total Captures</span>
          </div>
          <p className="text-2xl font-semibold">{aggregateMetrics.totalCaptures}</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Avg Completion</span>
          </div>
          <p className="text-2xl font-semibold">{aggregateMetrics.avgCompletionRate}%</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Active</span>
          </div>
          <p className="text-2xl font-semibold">{aggregateMetrics.activeUsers}</p>
        </div>
      </div>

      {/* Sort controls */}
      <div className="flex gap-2">
        <span className="text-sm text-muted-foreground">Sort by:</span>
        {([
          { value: 'captures' as const, label: 'Most Captures' },
          { value: 'completion' as const, label: 'Completion Rate' },
          { value: 'recent' as const, label: 'Recently Active' }
        ]).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSortBy(option.value)}
            className={cn(
              'text-sm px-2 py-1 rounded transition-colors',
              sortBy === option.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Leaderboard
        </h4>

        {sortedData.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No productivity data available
          </p>
        ) : (
          <div className="space-y-2">
            {sortedData.map((user, index) => {
              const displayName = user.userName || user.userEmail.split('@')[0]
              const completionColor = getCompletionRateColor(user.completionRate)
              const completionVariant = getCompletionRateVariant(user.completionRate)

              return (
                <div
                  key={user.userId}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border border-border bg-card',
                    index < 3 && 'border-primary/20 bg-primary/5'
                  )}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0">
                    {getRankIcon(index + 1)}
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.userEmail}</p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{user.totalCaptures}</p>
                      <p className="text-xs text-muted-foreground">captures</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={completionVariant} className={completionColor}>
                        {user.completionRate}%
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">completion</p>
                    </div>
                  </div>

                  {/* Last activity */}
                  {user.lastCaptureAt && (
                    <div className="text-xs text-muted-foreground text-right">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {new Date(user.lastCaptureAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Top performers highlight */}
      {topUsers.length > 0 && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Top Performers</h4>
          <div className="flex gap-2">
            {topUsers.map((user, index) => {
              const displayName = user.userName || user.userEmail.split('@')[0]
              return (
                <div key={user.userId} className="flex items-center gap-1">
                  {getRankIcon(index + 1)}
                  <span className="text-sm">{displayName}</span>
                  {index < topUsers.length - 1 && <span className="text-muted-foreground">·</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
