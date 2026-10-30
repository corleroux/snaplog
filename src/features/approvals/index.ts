/**
 * Approvals Feature Barrel Export
 */

export { ApprovalRequest } from '@/components/approval/ApprovalRequest'
export { ApprovalsInboxScreen } from './ApprovalsInboxScreen'
export * from './api/approvals'
export type { ApprovalEntityType, ApprovalStatus, ApprovalRequestProps } from '@/components/approval/ApprovalRequest'

// Types for the approval feature
export interface Approval {
  id: string
  entityType: string
  entityId: string
  requestedBy: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  // Add other relevant types
}

export interface PendingApproval {
  id: string
  entityType: string
  entityId: string
  entityName: string
  requestedByName: string | null
  requestedByEmail: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected'
  // Add other relevant fields
}