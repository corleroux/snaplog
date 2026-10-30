/**
 * Typed commit response helpers.
 *
 * Provides a standardized response type and factory functions for commit operations.
 * All commit responses include the idempotent flag and entity IDs.
 */

/**
 * Result of a commit operation.
 *
 * Generic over the entity-specific data type.
 * The `idempotent` flag indicates whether this was a fresh commit or or a replay of an existing one.
 */
export interface CommitResult<T> {
  /** Whether the was a fresh commit or or an idempotent replay */
  readonly idempotent: boolean
  /** The committed entity data */
  readonly data: T
  /** The scan session that was committed */
  readonly scanSessionId: string
}

/**
 * Create a successful commit result.
 */
export function createCommitSuccess<T>(args: {
  data: T
  scanSessionId: string
  idempotent?: boolean
}): CommitResult<T> {
  return {
    idempotent: args.idempotent ?? false,
    data: args.data,
    scanSessionId: args.scanSessionId,
  }
}

/**
 * Type guard for CommitResult.
 */
export function isCommitResult<T>(value: unknown): value is CommitResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'idempotent' in value &&
    'data' in value &&
    'scanSessionId' in value
  )
}
