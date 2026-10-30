import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'
import type { InventoryRecord } from '@/lib/supabase/types'

/**
 * Inventory record creation interface.
 */
export interface CreateInventoryRecordInput {
  styleId: string
  eventId: string
  vendorId: string
  variantId?: string | null
  quantity: number
  unit: string
  batchNo?: string | null
  stockStatus?: 'in_stock' | 'low_stock' | 'reserved' | 'sample_only' | 'out_of_stock'
}

/**
 * Create a new inventory record for a style or variant.
 *
 * Each entry is a time-series snapshot of the stock state.
 *
 * @param input - The inventory data to insert
 * @returns The created inventory record
 */
export async function createInventoryRecord(
  input: CreateInventoryRecordInput
): Promise<InventoryRecord> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('inventory_records')
    .insert({
      style_id: input.styleId,
      event_id: input.eventId,
      vendor_id: input.vendorId,
      variant_id: input.variantId || null,
      quantity: input.quantity,
      unit: input.unit,
      batch_no: input.batchNo || null,
      stock_status: input.stockStatus || 'in_stock',
      captured_at: new Date().toISOString(),
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
