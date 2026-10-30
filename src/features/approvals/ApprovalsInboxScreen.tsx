import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell, PageHeader } from '@/components/layout'
import { LoadingState, ErrorState } from '@/components/ui'
import { EntityCard } from '@/components/layout/EntityCard'
import { getPendingApprovals } from './api/approvals'
import type { ApprovalEntityType } from '@/components/approval/ApprovalRequest'

interface PendingApprovalItem {
  id: string
  entityType: ApprovalEntityType
  entityId: string
  entityName: string
  requestedBy: string
  requestedByEmail: string
  requestedByName: string | null
  requestedAt: string
  expiresAt: string | null
}

interface ApprovalsInboxScreenProps {
  onBack?: () => void
  onNavigateToStyle?: (styleId: string) => void
}

/**
 * Approvals Inbox Screen Component
 * 
 * This is the pending approvals inbox for a given event.
 */
export function ApprovalsInboxScreen({ onBack: _onBack, onNavigateToStyle }: ApprovalsInboxScreenProps = {}) {
  const { eventId = '' } = useParams()
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPendingApprovals = async () => {
      try {
        setLoading(true)
        const data = await getPendingApprovals(eventId)
        setPendingApprovals(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pending approvals')
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      fetchPendingApprovals()
    }
  }, [eventId])

  const handleNavigateToStyle = (styleId: string) => {
    if (onNavigateToStyle) {
      onNavigateToStyle(styleId)
    } else {
      // TODO: This requires vendorId resolution
      // Navigate to the event page - deep linking to style requires vendorId
      navigate(`/events/${eventId}`)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Approvals Inbox" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Loading pending approvals..." />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Approvals Inbox" />
        <div className="flex-1 flex items-center justify-center">
          <ErrorState
            title="Failed to load approvals"
            message={error}
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader 
        title="Approvals Inbox" 
        onBack={() => navigate(-1)}
      />
      <main className="flex-1 overflow-y-auto px-4 pt-3">
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <p className="font-medium">No pending approvals</p>
                <p className="text-sm mt-1">Check back later for new requests</p>
              </div>
            </div>
          ) : (
            pendingApprovals.map((item) => (
              <EntityCard
                key={item.id}
                title={item.entityName}
                subtitle={`Requested by ${item.requestedByName || item.requestedByEmail}`}
                onPress={() => handleNavigateToStyle(item.entityId)}
              />
            ))
          )}
        </div>
      </main>
    </AppShell>
  )
}