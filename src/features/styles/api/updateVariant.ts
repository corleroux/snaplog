import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import { getCurrentUserId } from '@/lib/supabase/auth'

const logger = createLogger('VariantUpdate')
import type { FabricVariant, InventoryRecord } from '@/lib/supabase/types'

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
 * Update fabric variant fields with optimistic concurrency control.
 *
 * This API updates committed variant business records.
 * It does NOT modify scan_sessions audit payloads.
 *
 * ARCHITECTURAL NOTE:
 * This function handles TWO distinct updates:
 *
 * 1. fabric_variants row update (variant fields):
 *    - color_code, color_name, variant_name
 *    - wash_code, finish_override
 *    - metadata
 *
 * 2. inventory_records row creation (stock snapshot):
 *    - quantity, unit, batch_no, stock_status
 *
 * IMPORTANT: Inventory is NOT updated in place. A NEW inventory record
 * is created to preserve stock history. This is intentional - inventory
 * is a time-series snapshot, not a mutable state.
 *
 * @param variantId - The fabric variant ID to update
 * @param updates - The variant fields and optional inventory update
 * @param expectedVersion - The version the caller expects (for optimistic concurrency)
 * @returns The updated variant
 * @throws {ConcurrencyConflictError} if the record was modified by another user
 */
export async function updateVariant(
  variantId: string,
  updates: VariantUpdate,
  expectedVersion: number
): Promise<FabricVariant> {
  const userId = await getCurrentUserId()

  // First, update the variant row with version check
  const { data, error } = await supabase
    .from('fabric_variants')
    .update({
      ...updates.variantFields,
      updated_at: new Date().toISOString(),
      updated_by: userId,
      version: expectedVersion + 1,
    })
    .eq('id', variantId)
    .eq('version', expectedVersion)
    .select()
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new ConcurrencyConflictError('fabric_variant', variantId)
  }

  // Second, if inventory update is provided, create a NEW inventory record
  // We do NOT update existing inventory - we append a new snapshot
  if (updates.inventoryFields) {
    const variant = data as FabricVariant // Type assertion for access
    const inventoryUpdate = updates.inventoryFields

    // Create new inventory record (append, don't update)
    const { error: inventoryError } = await supabase
      .from('inventory_records')
      .insert({
        variant_id: variantId,
        style_id: variant.style_id,
        event_id: variant.event_id,
        vendor_id: variant.vendor_id,
        quantity: inventoryUpdate.quantity,
        unit: inventoryUpdate.unit,
        batch_no: inventoryUpdate.batch_no,
        stock_status: inventoryUpdate.stock_status,
        captured_at: new Date().toISOString(),
        created_by: userId,
      })

    // Log inventory error but don't fail the variant update
    // Variant update succeeds even if inventory creation fails
    if (inventoryError) {
      logger.error('Failed to create inventory record', { error: String(inventoryError) })
    }
  }

  return data
}

/**
 * Variant update type.
 * Includes editable variant fields and optional inventory update.
 */
export interface VariantUpdate {
  variantFields: {
    color_code?: string | null
    color_name?: string | null
    variant_name?: string | null
    wash_code?: string | null
    finish_override?: string | null
    metadata?: Record<string, unknown> | null
  }
  inventoryFields?: {
    quantity?: number
    unit?: string
    batch_no?: string | null
    stock_status?: 'in_stock' | 'low_stock' | 'reserved' | 'sample_only' | 'out_of_stock'
  }
}

/**
 * Get a single variant with its latest inventory.
 *
 * @param variantId - The variant ID
 * @returns The variant with latest inventory record
 */
export async function getVariant(variantId: string): Promise<{
  variant: FabricVariant
  inventory: InventoryRecord | null
}> {
  const { data: variant, error } = await supabase
    .from('fabric_variants')
    .select('*')
    .eq('id', variantId)
    .single()

  if (error) {
    throw error
  }

  // Get latest inventory record
  const { data: inventory } = await supabase
    .from('inventory_records')
    .select('*')
    .eq('variant_id', variantId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    variant,
    inventory: inventory ?? null,
  }
}
