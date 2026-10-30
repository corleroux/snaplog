/**
 * Event Members Section
 *
 * Section component for managing event members.
 * Shows list of members with add/remove functionality.
 *
 * Features:
 * - List members with avatars, names, roles
 * - Remove button for non-owner members
 * - Add Member button (opens modal)
 * - Empty state when no other members
 * - Loading state
 */

import { useState, useCallback, useEffect } from 'react'
import { UserPlus, Trash2, Loader2, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { useToast } from '@/components/ui/toast'
import {
  getEventMembers,
  removeMemberFromEvent,
  type EventMemberRecord,
} from '../api/eventMembersRepository'
import { AddMemberModal } from './AddMemberModal'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

export interface EventMembersSectionProps {
  eventId: string
  currentUserId: string
  canEdit: boolean
}

type State = 'loading' | 'loaded' | 'error'

// Helper to check if user can manage members
export function canEditEventMembers(userRole?: string): boolean {
  return userRole === 'owner' || userRole === 'admin'
}

// Helper to get badge variant for role
function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'accent' {
  switch (role) {
    case 'owner':
      return 'accent'
    case 'admin':
      return 'default'
    default:
      return 'secondary'
  }
}

export function EventMembersSection({
  eventId,
  currentUserId,
  canEdit,
}: EventMembersSectionProps) {
  const [state, setState] = useState<State>('loading')
  const [members, setMembers] = useState<EventMemberRecord[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<{ member: EventMemberRecord } | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const { showToast } = useToast()

  // Load members
  const loadMembers = useCallback(async () => {
    setState('loading')
    setError(null)

    try {
      const [membersData] = await Promise.all([
        getEventMembers(eventId),
        supabase.auth.getUser(),
      ])

      setMembers(membersData)

      // Find current user's role
      const currentUserMember = membersData.find((m) => m.userId === currentUserId)
      setUserRole(currentUserMember?.role || null)

      setState('loaded')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load members'
      setError(message)
      setState('error')
    }
  }, [eventId, currentUserId])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  const handleAddMember = useCallback(() => {
    loadMembers()
    showToast({
      title: 'Member added',
      description: 'New member has been added to the event',
      variant: 'success',
      duration: 3000,
    })
  }, [loadMembers, showToast])

  const handleRemoveClick = useCallback((member: EventMemberRecord) => {
    setConfirmRemove({ member })
  }, [])

  const handleConfirmRemove = useCallback(async () => {
    if (!confirmRemove) return

    setIsRemoving(true)
    setError(null)

    try {
      await removeMemberFromEvent(eventId, confirmRemove.member.userId)

      showToast({
        title: 'Member removed',
        description: `${confirmRemove.member.profile?.fullName || 'Member'} has been removed from the event`,
        variant: 'success',
        duration: 3000,
      })

      setConfirmRemove(null)
      loadMembers()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove member'
      setError(message)
      showToast({
        title: 'Remove failed',
        description: message,
        variant: 'error',
        duration: 5000,
      })
    } finally {
      setIsRemoving(false)
    }
  }, [confirmRemove, eventId, loadMembers, showToast])

  // Get existing member IDs for filtering
  const existingMemberIds = new Set(members.map((m) => m.userId))

  // Check if user can remove a specific member
  const canRemoveMember = useCallback(
    (member: EventMemberRecord): boolean => {
      // Can't remove yourself
      if (member.userId === currentUserId) return false

      // Only owners/admins can remove
      if (!canEditEventMembers(userRole || undefined)) return false

      // Can't remove owners unless you're also an owner (and there are multiple)
      if (member.role === 'owner') {
        const ownerCount = members.filter((m) => m.role === 'owner').length
        return userRole === 'owner' && ownerCount > 1
      }

      return true
    },
    [currentUserId, userRole, members]
  )

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-center">
        <p className="text-sm text-destructive">{error || 'Failed to load members'}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadMembers}
          className="mt-2"
          radius="pill"
        >
          Retry
        </Button>
      </div>
    )
  }

  const hasMembers = members.length > 1

  return (
    <>
      <div className="space-y-4">
        {/* Add Member Button */}
        {canEdit && (
          <Button
            type="button"
            variant="accent"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto"
            radius="pill"
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </Button>
        )}

        {/* Members List */}
        {hasMembers ? (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border border-border',
                  'bg-card hover:bg-muted/30 transition-colors'
                )}
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {member.profile?.avatarUrl ? (
                    <img
                      src={member.profile.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {(member.profile?.fullName || member.profile?.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {member.profile?.fullName || member.profile?.email || 'Unknown User'}
                    </p>
                    {member.userId === currentUserId && (
                      <span className="text-xs text-muted-foreground">(you)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={getRoleBadgeVariant(member.role)} size="sm">
                      {member.role}
                    </Badge>
                    {member.profile?.companyName && (
                      <span className="text-xs text-muted-foreground truncate">
                        {member.profile.companyName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Remove button */}
                {canRemoveMember(member) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemoveClick(member)}
                    disabled={isRemoving}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="No other members"
            description="Add team members to collaborate on this event"
            action={
              canEdit
                ? {
                    label: 'Add First Member',
                    onClick: () => setIsAddModalOpen(true),
                    variant: 'outline',
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        eventId={eventId}
        onMemberAdded={handleAddMember}
        existingMemberIds={existingMemberIds}
      />

      {/* Remove Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleConfirmRemove}
        title="Remove member?"
        description={`Are you sure you want to remove ${confirmRemove?.member.profile?.fullName || 'this member'} from the event? They will lose access to all event data.`}
        confirmText="Remove"
        cancelText="Keep Member"
        variant="destructive"
        icon={<Shield className="h-6 w-6 text-amber-500" />}
        isConfirming={isRemoving}
      />
    </>
  )
}
