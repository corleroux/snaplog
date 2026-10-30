/**
 * Approval Request Component
 *
 * Displays approval status and allows requesting/responding to approvals.
 */

import { useState, useCallback } from 'react'
import { Check, X, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

export type ApprovalEntityType = 'vendor' | 'style' | 'variant'

export interface ApprovalStatus {
  id: string
  entityType: ApprovalEntityType
  entityId: string
  requestedBy: string
  requestedByEmail: string
  requestedByName: string | null
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  respondedBy: string | null
  respondedByEmail: string | null
  respondedByName: string | null
  respondedAt: string | null
  responseNote: string | null
  expiresAt: string | null
}

export interface ApprovalRequestProps {
  /** Type of entity */
  entityType: ApprovalEntityType
  /** ID of entity */
  entityId: string
  /** Name of entity (for display) */
  entityName?: string
  /** Current approval status (if any) */
  approvalStatus?: ApprovalStatus | null
  /** Callback when approval is requested */
  onRequestApproval?: () => Promise<void>
  /** Callback when approval is responded to */
  onRespondToApproval?: (requestId: string, status: 'approved' | 'rejected', note?: string) => Promise<void>
  /** Whether the current user can request approval */
  canRequest?: boolean
  /** Whether the current user can respond to approval */
  canRespond?: boolean
  /** Optional additional className */
  className?: string
}

/**
 * Approval Request Component
 *
 * Shows approval status and allows requesting/responding to approvals.
 */
export function ApprovalRequest({
  entityType,
  entityId: _entityId,
  entityName: _entityName,
  approvalStatus,
  onRequestApproval,
  onRespondToApproval,
  canRequest = true,
  canRespond = true,
  className
}: ApprovalRequestProps) {
  const [isResponding, setIsResponding] = useState(false)
  const [responseNote, setResponseNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  const handleRequestApproval = useCallback(async () => {
    if (!onRequestApproval) return

    setIsSubmitting(true)
    try {
      await onRequestApproval()
      showToast({
        title: 'Approval requested',
        description: 'An approval request has been created',
        variant: 'success',
        duration: 3000
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to request approval'
      showToast({
        title: 'Request failed',
        description: message,
        variant: 'error',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [onRequestApproval, showToast])

  const handleRespond = useCallback(async (status: 'approved' | 'rejected') => {
    if (!onRespondToApproval || !approvalStatus) return

    setIsSubmitting(true)
    try {
      await onRespondToApproval(approvalStatus.id, status, responseNote || undefined)
      setIsResponding(false)
      setResponseNote('')
      showToast({
        title: status === 'approved' ? 'Approved' : 'Rejected',
        description: `The request has been ${status}`,
        variant: 'success',
        duration: 3000
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to respond'
      showToast({
        title: 'Response failed',
        description: message,
        variant: 'error',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [onRespondToApproval, approvalStatus, responseNote, showToast])

  const getStatusBadge = () => {
    if (!approvalStatus) return null

    const statusConfig = {
      pending: {
        icon: Clock,
        label: 'Pending',
        variant: 'outline' as const,
        className: 'text-yellow-600 dark:text-yellow-400 border-yellow-600 dark:border-yellow-400'
      },
      approved: {
        icon: Check,
        label: 'Approved',
        variant: 'outline' as const,
        className: 'text-green-600 dark:text-green-400 border-green-600 dark:border-green-400'
      },
      rejected: {
        icon: X,
        label: 'Rejected',
        variant: 'outline' as const,
        className: 'text-red-600 dark:text-red-400 border-red-600 dark:border-red-400'
      }
    }

    const config = statusConfig[approvalStatus.status]
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className={cn(config.className)}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className={cn('border border-border rounded-lg p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Approval Status</h4>
        {getStatusBadge()}
      </div>

      {/* No approval status */}
      {!approvalStatus && canRequest && onRequestApproval && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <AlertCircle className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">No approval requested</p>
            <p className="text-xs text-muted-foreground">
              Request approval before proceeding with this {entityType}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleRequestApproval}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Requesting...' : 'Request Approval'}
          </Button>
        </div>
      )}

      {/* Pending approval */}
      {approvalStatus?.status === 'pending' && (
        <div className="space-y-3">
          <div className="text-sm">
            <p className="text-muted-foreground">
              Requested by <span className="font-medium text-foreground">
                {approvalStatus.requestedByName || approvalStatus.requestedByEmail}
              </span> on {formatDate(approvalStatus.requestedAt)}
            </p>
            {approvalStatus.expiresAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Expires on {formatDate(approvalStatus.expiresAt)}
              </p>
            )}
          </div>

          {canRespond && onRespondToApproval && !isResponding && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => setIsResponding(true)}
                disabled={isSubmitting}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => handleRespond('rejected')}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {isResponding && (
            <div className="space-y-2">
              <Textarea
                placeholder="Add a note (optional)..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRespond('approved')}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRespond('rejected')}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsResponding(false)
                    setResponseNote('')
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approved/Rejected */}
      {approvalStatus && (approvalStatus.status === 'approved' || approvalStatus.status === 'rejected') && (
        <div className="space-y-2">
          <div className="text-sm">
            <p className="text-muted-foreground">
              {approvalStatus.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
              <span className="font-medium text-foreground">
                {approvalStatus.respondedByName || approvalStatus.respondedByEmail || 'Unknown'}
              </span>{' '}
              on {formatDate(approvalStatus.respondedAt || approvalStatus.requestedAt)}
            </p>
          </div>

          {approvalStatus.responseNote && (
            <div className="text-sm p-2 bg-muted rounded">
              <p className="text-xs text-muted-foreground mb-1">Response note:</p>
              <p>{approvalStatus.responseNote}</p>
            </div>
          )}

          {canRequest && onRequestApproval && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequestApproval}
              disabled={isSubmitting}
            >
              Request New Approval
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
