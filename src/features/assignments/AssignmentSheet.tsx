import { useState } from 'react'
import { Users, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/textarea'
import { LoadingState } from '@/components/ui/LoadingState'
import { getEntityAssignees, assignEntity, unassignEntity, type EntityType } from './api'
import { getEventMembers, type EventMemberRecord } from '@/features/events'

function toMember(m: EventMemberRecord): { id: string; email: string; fullName: string | null; avatarUrl: string | null } {
  return {
    id: m.userId,
    email: m.profile?.email || '',
    fullName: m.profile?.fullName || null,
    avatarUrl: m.profile?.avatarUrl || null,
  }
}

interface AssignmentSheetProps {
  entityType: EntityType
  entityId: string
  eventId: string
  canAssign: boolean
}

interface Assignee {
  userId: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  assignedAt: string
  assignedByEmail: string
  notes: string | null
}

interface Member {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export function AssignmentSheet({ entityType, entityId, eventId, canAssign }: AssignmentSheetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [assignees, setAssignees] = useState<Assignee[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const openSheet = async () => {
    setIsOpen(true)
    setLoading(true)
    try {
      const [assigneesData, membersData] = await Promise.all([
        getEntityAssignees(entityType, entityId),
        getEventMembers(eventId),
      ])
      setAssignees(assigneesData)
      setMembers(membersData.map(toMember))
    } catch (err) {
      console.error('Failed to load assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  const closeSheet = () => {
    setIsOpen(false)
    setSelectedMemberId('')
    setNotes('')
  }

  const handleAssign = async () => {
    if (!selectedMemberId || submitting) return
    setSubmitting(true)
    try {
      await assignEntity(entityType, entityId, selectedMemberId, notes || undefined)
      const [assigneesData] = await Promise.all([
        getEntityAssignees(entityType, entityId),
      ])
      setAssignees(assigneesData)
      setSelectedMemberId('')
      setNotes('')
    } catch (err) {
      console.error('Failed to assign:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    if (submitting) return
    setSubmitting(true)
    try {
      await unassignEntity(entityType, entityId, userId)
      const [assigneesData] = await Promise.all([
        getEntityAssignees(entityType, entityId),
      ])
      setAssignees(assigneesData)
    } catch (err) {
      console.error('Failed to remove assignment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const assignedUserIds = new Set(assignees.map(a => a.userId))
  const unassignedMembers = members.filter(m => !assignedUserIds.has(m.id))

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={openSheet}
        className="w-full justify-start gap-2"
      >
        <Users className="h-4 w-4" />
        Manage Assignments
        {assignees.length > 0 && (
          <span className="ml-auto bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
            {assignees.length}
          </span>
        )}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={closeSheet}
        title="Assignments"
        placement="top"
      >
        {loading ? (
          <div className="py-8">
            <LoadingState message="Loading assignments..." />
          </div>
        ) : (
          <>
            {assignees.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No members assigned yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {assignees.map(assignee => (
                  <li key={assignee.userId} className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                      {getInitials(assignee.fullName, assignee.email)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {assignee.fullName || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {assignee.email}
                      </p>
                    </div>
                    {canAssign && (
                      <button
                        onClick={() => handleRemove(assignee.userId)}
                        disabled={submitting}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canAssign && (
              <div className="border-t border-border pt-4 mt-4">
                {unassignedMembers.length > 0 ? (
                  <>
                    <select
                      value={selectedMemberId}
                      onChange={e => setSelectedMemberId(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-3"
                    >
                      <option value="">Select a member...</option>
                      {unassignedMembers.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.fullName || member.email}
                        </option>
                      ))}
                    </select>
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Notes (optional)"
                      size="sm"
                      className="mb-3"
                    />
                    <Button
                      onClick={handleAssign}
                      disabled={submitting || !selectedMemberId}
                      className="w-full"
                    >
                      {submitting ? 'Assigning...' : 'Assign'}
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-2">
                    No more members available to assign.
                  </p>
                )}
              </div>
            )}

            {!canAssign && (
              <p className="text-muted-foreground text-sm text-center py-4 border-t border-border mt-4">
                Contact an admin to manage assignments.
              </p>
            )}
          </>
        )}
      </Modal>
    </>
  )
}