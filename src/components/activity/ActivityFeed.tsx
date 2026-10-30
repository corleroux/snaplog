/**
 * Activity Feed Component
 *
 * Displays a feed of actions/activities with filtering by type.
 */

import { useState, useMemo } from 'react'
import { Filter, ChevronDown, User, FileText, Camera, MessageSquare, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type ActivityType = 'all' | 'capture' | 'edit' | 'comment' | 'approval' | 'delete' | 'other'

export interface Activity {
  id: string
  type: ActivityType
  action: string
  entityName: string
  entityType: string
  entityId: string
  userId: string
  userEmail: string
  userName?: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface ActivityFeedProps {
  /** Activities to display */
  activities: Activity[]
  /** Optional additional className */
  className?: string
  /** Maximum items to show */
  maxItems?: number
  /** Link resolver for entities */
  getEntityLink?: (entityType: string, entityId: string) => string
}

const ACTIVITY_FILTERS: { type: ActivityType; label: string; icon: typeof Camera }[] = [
  { type: 'all', label: 'All', icon: Filter },
  { type: 'capture', label: 'Captures', icon: Camera },
  { type: 'edit', label: 'Edits', icon: FileText },
  { type: 'comment', label: 'Comments', icon: MessageSquare },
  { type: 'approval', label: 'Approvals', icon: CheckCircle },
  { type: 'delete', label: 'Deletes', icon: User },
  { type: 'other', label: 'Other', icon: Filter }
]

/**
 * Get activity type from action string
 */
function getActivityType(action: string): ActivityType {
  const lowerAction = action.toLowerCase()
  if (lowerAction.includes('capture') || lowerAction.includes('created')) return 'capture'
  if (lowerAction.includes('edit') || lowerAction.includes('update') || lowerAction.includes('modify')) return 'edit'
  if (lowerAction.includes('comment') || lowerAction.includes('reply')) return 'comment'
  if (lowerAction.includes('approve') || lowerAction.includes('reject')) return 'approval'
  if (lowerAction.includes('delete') || lowerAction.includes('archive') || lowerAction.includes('remove')) return 'delete'
  return 'other'
}

/**
 * Get icon for activity type
 */
function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'capture': return Camera
    case 'edit': return FileText
    case 'comment': return MessageSquare
    case 'approval': return CheckCircle
    case 'delete': return User
    default: return Filter
  }
}

/**
 * Get color for activity type
 */
function getActivityColor(type: ActivityType) {
  switch (type) {
    case 'capture': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
    case 'edit': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950'
    case 'comment': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950'
    case 'approval': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950'
    case 'delete': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950'
    default: return 'text-muted-foreground bg-muted'
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * Activity Feed Component
 *
 * Displays a feed of activities with filtering by type.
 */
export function ActivityFeed({
  activities,
  className,
  maxItems,
  getEntityLink
}: ActivityFeedProps) {
  const [filter, setFilter] = useState<ActivityType>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Enrich activities with type
  const enrichedActivities = useMemo(() => {
    return activities.map(activity => ({
      ...activity,
      type: activity.type || getActivityType(activity.action)
    }))
  }, [activities])

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = filter === 'all'
      ? enrichedActivities
      : enrichedActivities.filter(a => a.type === filter)

    if (maxItems) {
      filtered = filtered.slice(0, maxItems)
    }

    return filtered
  }, [enrichedActivities, filter, maxItems])

  const selectedFilter = ACTIVITY_FILTERS.find(f => f.type === filter)
  const FilterIcon = selectedFilter?.icon || Filter

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with filter */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Activity Feed</h3>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <FilterIcon className="h-4 w-4" />
            {selectedFilter?.label}
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              showFilters && 'rotate-180'
            )} />
          </Button>

          {/* Filter dropdown */}
          {showFilters && (
            <div className="absolute right-0 top-full mt-2 z-10 w-48 bg-popover border border-border rounded-md shadow-lg">
              <div className="p-1">
                {ACTIVITY_FILTERS.map((f) => {
                  const Icon = f.icon
                  return (
                    <button
                      key={f.type}
                      type="button"
                      onClick={() => {
                        setFilter(f.type)
                        setShowFilters(false)
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-sm flex items-center gap-2',
                        'hover:bg-muted transition-colors',
                        filter === f.type && 'bg-muted'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{f.label}</span>
                      {filter === f.type && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredActivities.length} of {enrichedActivities.length} activities
      </p>

      {/* Activity list */}
      {filteredActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No activities found
        </p>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            const iconColor = getActivityColor(activity.type)
            const userName = activity.userName || activity.userEmail.split('@')[0]
            const entityLink = getEntityLink?.(activity.entityType, activity.entityId)

            return (
              <div
                key={activity.id}
                className="flex gap-3 p-3 rounded-lg border border-border bg-card"
              >
                {/* Icon */}
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0',
                  iconColor
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{userName}</span>
                    {' '}{activity.action.toLowerCase()}{' '}
                    {entityLink ? (
                      <a
                        href={entityLink}
                        className="font-medium text-primary hover:underline"
                      >
                        {activity.entityName}
                      </a>
                    ) : (
                      <span className="font-medium">{activity.entityName}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>

                {/* Badge */}
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {activity.entityType}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
