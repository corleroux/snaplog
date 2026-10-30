/**
 * Shared helpers for idempotent commit replay detection.
 * Keep response payload construction local to each handler.
 */

export interface IdempotencyCheckResult<T> {
  alreadyCommitted: boolean
  existingId: T | null
}

/**
 * Checks whether a commit has already happened by inspecting a linkage field value.
 *
 * Returns:
 * - { alreadyCommitted: false, existingId: null } if the field is null/undefined
 * - { alreadyCommitted: true, existingId: T } if the field has a value
 *
 * @param value - The linkage field value (e.g., vendor_id, style_id)
 * @returns IdempotencyCheckResult indicating whether a commit already exists
 */
export function getExistingCommittedResourceId<T>(
  value: T | null | undefined
): IdempotencyCheckResult<T> {
  if (value === null || value === undefined) {
    return {
      alreadyCommitted: false,
      existingId: null,
    }
  }

  return {
    alreadyCommitted: true,
    existingId: value,
  }
}
