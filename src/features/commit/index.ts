/**
 * Commit domain utilities.
 *
 * Centralized commit error types, idempotency checks, and response shaping.
 * Used by both vendor and fabric commit flows.
 *
 * @example
 * import { isAlreadyCommitted, CommitError } from '@/features/commit'
 */

export {
  CommitError,
  type CommitErrorType,
  isCommitError,
  classifyCommitError,
  getCommitErrorMessage,
  COMMIT_ERROR_MESSAGES,
} from './commitError'

export {
  isAlreadyCommitted,
  getExistingCommitId,
  isVendorCommitted,
  isStyleCommitted,
  getCommittedVendorId,
  getCommittedStyleId,
  type EntityRefColumn,
  type IdempotencyCheckResult,
} from './idempotency'

export {
  type CommitResult,
  createCommitSuccess,
  isCommitResult,
} from './commitResponse'
