/**
 * Assignee Select Component
 *
 * Allows selecting users to assign entities to.
 * Shows current assignees and allows adding/removing assignments.
 */

import { useState, useCallback } from 'react'
import { User, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useToast } from '@/components/ui/toast'

export interface Assignee {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
}

export interface Assignment {
  userId: string
  email: string
  fullName?: string
  avatarUrl?: string
  assignedAt: string
  assignedByEmail: string
  notes?: string
}

export interface AssigneeSelectProps {
  /** Current assignments */
  assignments: Assignment[]
  /** Available users to assign */
  availableUsers: Assignee[]
  /** Callback when a user is assigned */
  onAssign: (userId: string, notes?: string) => Promise<void>
  /** Callback when an assignment is removed */
  onUnassign: (userId: string) => Promise<void>
  /** Whether the component is disabled */
  disabled?: boolean
  /** Optional additional className */
  className?: string
}

/**
 * Assignee select component
 *
 * Displays current assignees as avatars/badges and allows
 * adding new assignments from available users.
 */
export function AssigneeSelect({
  assignments,
  availableUsers,
  onAssign,
  onUnassign,
  disabled = false,
  className,
}: AssigneeSelectProps) {
  const { showToast } = useToast()
  const [isAssigning, setIsAssigning] = useState<Record<string, boolean>>({})
  const [isUnassigning, setIsUnassigning] = useState<Record<string, boolean>>({})

  // Filter out already assigned users from available list
  const assignedUserIds = new Set(assignments.map(a => a.userId))
  const unassignedUsers = availableUsers.filter(u => !assignedUserIds.has(u.id))

  const handleAssign = useCallback(async (userId: string) => {
    if (isAssigning[userId]) return

    try {
      setIsAssigning(prev => ({ ...prev, [userId]: true }))
      await onAssign(userId)
      showToast({
        title: 'Assigned',
        description: 'User has been assigned',
        variant: 'success',
        duration: 2000,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign user'
      showToast({
        title: 'Assignment failed',
        description: message,
        variant: 'error',
        duration: 3000,
      })
    } finally {
      setIsAssigning(prev => ({ ...prev, [userId]: false }))
    }
  }, [isAssigning, onAssign, showToast])

  const handleUnassign = useCallback(async (userId: string) => {
    if (isUnassigning[userId]) return

    try {
      setIsUnassigning(prev => ({ ...prev, [userId]: true }))
      await onUnassign(userId)
      showToast({
        title: 'Unassigned',
        description: 'Assignment has been removed',
        variant: 'success',
        duration: 2000,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unassign user'
      showToast({
        title: 'Unassign failed',
        description: message,
        variant: 'error',
        duration: 3000,
      })
    } finally {
      setIsUnassigning(prev => ({ ...prev, [userId]: false }))
    }
  }, [isUnassigning, onUnassign, showToast])

  const getInitials = (name?: string, email?: string) => {
    const displayName = name || email || ''
    return displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Current assignments */}
      {assignments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.userId}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
                'bg-primary/10 text-primary',
                'border border-primary/20',
                'group'
              )}
            >
              {/* Avatar or initials */}
              {assignment.avatarUrl ? (
                <img
                  src={assignment.avatarUrl}
                  alt={assignment.fullName || assignment.email}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                  {getInitials(assignment.fullName, assignment.email)}
                </div>
              )}
              {/* Name */}
              <span className="text-sm font-medium">
                {assignment.fullName || assignment.email.split('@')[0]}
              </span>
              {/* Remove button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleUnassign(assignment.userId)}
                  disabled={disabled || isUnassigning[assignment.userId]}
                  className={cn(
                    'ml-1 opacity-0 group-hover:opacity-100',
                    'transition-opacity',
                    'hover:bg-destructive/20 rounded-full p-0.5',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                  aria-label={`Remove ${assignment.fullName || assignment.email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Available users to assign */}
      {!disabled && unassignedUsers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Assign to:</p>
          <div className="flex flex-wrap gap-2">
            {unassignedUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleAssign(user.id)}
                disabled={disabled || isAssigning[user.id]}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
                  'bg-muted hover:bg-muted/80',
                  'border border-border',
                  'transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || user.email}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">
                  {user.fullName || user.email.split('@')[0]}
                </span>
                <Plus className="h-3 w-3 text-muted-foreground" />
                {isAssigning[user.id] && (
                  <span className="h-3 w-3 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {assignments.length === 0 && !disabled && unassignedUsers.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No team members available</p>
      )}
    </div>
  )
}
