/**
 * Centralized idempotency check utilities for commit operations.
 *
 * Provides reusable functions to check whether a scan session
 * has already been committed, preventing duplicate canonical writes.
 *
 * Usage:
 *   import { isAlreadyCommitted, getExistingCommitId } from '@/features/commit/idempotency'
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Entity reference columns in scan_sessions table.
 * Used to determine which column to check for existing commits.
 */
export type EntityRefColumn = 'vendor_id' | 'style_id'

/**
 * Result of an idempotency check.
 */
export interface IdempotencyCheckResult {
  /** Whether the scan session already has a committed entity */
  alreadyCommitted: boolean
  /** The existing entity ID if committed, null otherwise */
  existingId: string | null
}

/**
 * Check if a scan session has already been committed.
 *
 * Queries the scan_sessions table for the entity reference column
 * to determine if a canonical record has already been created.
 *
 * @param scanSessionId - The scan session to check
 * @param entityRefColumn - Which column to check ('vendor_id' or 'style_id')
 * @returns Whether the session is already committed
 */
export async function isAlreadyCommitted(
  scanSessionId: string,
  entityRefColumn: EntityRefColumn
): Promise<boolean> {
  const result = await getExistingCommitId(scanSessionId, entityRefColumn)
  return result.alreadyCommitted
}

/**
 * Get the existing committed entity ID for a scan session.
 *
 * Returns the full idempotency check result including the existing ID
 * if the session has already been committed.
 *
 * @param scanSessionId - The scan session to check
 * @param entityRefColumn - Which column to check ('vendor_id' or 'style_id')
 * @returns The idempotency check result
 */
export async function getExistingCommitId(
  scanSessionId: string,
  entityRefColumn: EntityRefColumn
): Promise<IdempotencyCheckResult> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select(entityRefColumn)
    .eq('id', scanSessionId)
    .single()

  if (error || !data) {
    return { alreadyCommitted: false, existingId: null }
  }

  const existingId = (data as any)[entityRefColumn] as string | null
  return {
    alreadyCommitted: existingId !== null,
    existingId,
  }
}

/**
 * Convenience: check if vendor is already committed.
 */
export async function isVendorCommitted(scanSessionId: string): Promise<boolean> {
  return isAlreadyCommitted(scanSessionId, 'vendor_id')
}

/**
 * Convenience: check if fabric style is already committed.
 */
export async function isStyleCommitted(scanSessionId: string): Promise<boolean> {
  return isAlreadyCommitted(scanSessionId, 'style_id')
}

/**
 * Convenience: get existing vendor ID from scan session.
 */
export async function getCommittedVendorId(scanSessionId: string): Promise<string | null> {
  const result = await getExistingCommitId(scanSessionId, 'vendor_id')
  return result.existingId
}

/**
 * Convenience: get existing style ID from scan session.
 */
export async function getCommittedStyleId(scanSessionId: string): Promise<string | null> {
  const result = await getExistingCommitId(scanSessionId, 'style_id')
  return result.existingId
}
