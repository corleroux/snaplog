import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'
import type { FabricStyle } from '@/lib/supabase/types'

/**
 * Error thrown when an update is rejected due to version mismatch.
 *
 * This indicates the record was modified by another user after the
 * caller last read it. The caller should refresh and retry.
 */
export class ConcurrencyConflictError extends Error {
  constructor(entityType: string, id: string) {
    super(
      `CONFLICT: This ${entityType} (${id}) was modified by another user. Please refresh and try again.`
    )
    this.name = 'ConcurrencyConflictError'
  }
}

/**
 * Update fabric style fields with optimistic concurrency control.
 *
 * This API updates committed fabric style business records.
 * It does NOT modify scan_sessions audit payloads.
 *
 * Editable style fields:
 * - item_code
 * - name
 * - composition
 * - category
 * - construction
 * - finish
 * - width_cm
 * - width_in
 * - weight_gsm
 * - weight_ozsy
 * - pattern
 * - season
 * - metadata
 *
 * @param styleId - The fabric style ID to update
 * @param updates - The fields to update
 * @param expectedVersion - The version the caller expects (for optimistic concurrency)
 * @returns The updated style
 * @throws {ConcurrencyConflictError} if the record was modified by another user
 */
export async function updateStyle(
  styleId: string,
  updates: StyleUpdate,
  expectedVersion: number
): Promise<FabricStyle> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('fabric_styles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId,
      version: expectedVersion + 1,
    })
    .eq('id', styleId)
    .eq('version', expectedVersion)
    .select()
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new ConcurrencyConflictError('fabric_style', styleId)
  }

  return data
}

/**
 * Style update type.
 * Only includes editable master style fields.
 */
export interface StyleUpdate {
  item_code?: string
  name?: string | null
  composition?: string | null
  category?: string | null
  construction?: string | null
  finish?: string | null
  width_cm?: number | null
  width_in?: number | null
  weight_gsm?: number | null
  weight_ozsy?: number | null
  pattern?: string | null
  season?: string | null
  metadata?: Record<string, unknown> | null
}
