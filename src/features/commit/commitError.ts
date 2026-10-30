/**
 * Centralized commit error types and classification.
 *
 * This module provides a single source of truth for commit error types
 * used across both vendor and fabric commit flows.
 *
 * Replaces duplicated CommitErrorType definitions in:
 * - src/features/vendors/types/vendorCommit.ts
 * - src/features/styles/types/fabricCommit.ts
 */

/**
 * All possible commit error types.
 *
 * These classify the the failure reason for a commit operation.
 * Each type maps to a specific user-facing message and recovery strategy.
 */
export type CommitErrorType =
  | 'validation_failed'
  | 'scan_session_not_found'
  | 'permission_denied'
  | 'already_committed'
  | 'persistence_error'
  | 'related_record_error'
  | 'scan_session_update_failed'
  | 'unknown_error'

/**
 * Error classification for commit operations.
 *
 * Provides structured error information with type, message, and optional details.
 */
export class CommitError extends Error {
  readonly type: CommitErrorType
  readonly details?: unknown

  constructor(type: CommitErrorType, message: string, details?: unknown) {
    super(message)
    this.name = 'CommitError'
    this.type = type
    this.details = details
  }
}

/**
 * Type guard for CommitError.
 */
export function isCommitError(error: unknown): error is CommitError {
  return (
    error instanceof CommitError ||
    (typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      'message' in error &&
      typeof (error as any).type === 'string' &&
      typeof (error as any).message === 'string')
  )
}

/**
 * Classify an unknown error into a CommitErrorType.
 *
 * Uses the error message to determine the most appropriate classification.
 * Falls back to 'unknown_error' if no pattern matches.
 */
export function classifyCommitError(error: unknown): CommitErrorType {
  if (!error) return 'unknown_error'

  const message =
    error instanceof Error ? error.message :
    typeof error === 'string' ? error :
    'Unknown error'

  if (message.includes('already committed') || message.includes('already_committed'))
    return 'already_committed'
  if (message.includes('not found') || message.includes('not_found'))
    return 'scan_session_not_found'
  if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden'))
    return 'permission_denied'
  if (message.includes('violates') || message.includes('invalid') || message.includes('required'))
    return 'validation_failed'
  if (message.includes('insert') || message.includes('update') || message.includes('database'))
    return 'persistence_error'

  return 'unknown_error'
}

/**
 * User-facing messages for each error type.
 */
export const COMMIT_ERROR_MESSAGES: Record<CommitErrorType, string> = {
  validation_failed: 'Invalid commit data. Please check your input and try again.',
  scan_session_not_found: 'Scan session not found. Please try capturing again.',
  permission_denied: "You don't have permission to save here. Contact an admin.",
  already_committed: 'This data has already been saved.',
  persistence_error: 'Failed to save. Please try again.',
  related_record_error: 'Saved successfully, but some related data was not saved.',
  scan_session_update_failed: 'Saved successfully. Audit record may be incomplete.',
  unknown_error: 'Something went wrong. Please try again.',
}

/**
 * Get a user-facing message for a commit error type.
 */
export function getCommitErrorMessage(type: CommitErrorType): string {
  return COMMIT_ERROR_MESSAGES[type] || COMMIT_ERROR_MESSAGES.unknown_error
}
