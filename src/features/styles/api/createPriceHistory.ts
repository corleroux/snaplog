import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'
import type { PriceHistory } from '@/lib/supabase/types'

/**
 * Price history creation interface.
 */
export interface CreatePriceHistoryInput {
  styleId: string
  eventId: string
  vendorId: string
  variantId?: string | null
  currency: string
  price: number
  price_unit: string
  minimum_order_quantity?: number | null
  minimum_order_unit?: string | null
  lead_time_value?: number | null
  lead_time_unit?: string | null
  notes?: string | null
}

/**
 * Add a new price history entry for a style or variant.
 *
 * Each save creates a new entry to preserve price evolution history.
 *
 * @param input - The price history data to insert
 * @returns The created price history record
 */
export async function createPriceHistory(
  input: CreatePriceHistoryInput
): Promise<PriceHistory> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('price_history')
    .insert({
      style_id: input.styleId,
      event_id: input.eventId,
      vendor_id: input.vendorId,
      variant_id: input.variantId || null,
      currency: input.currency,
      price: input.price,
      price_unit: input.price_unit,
      minimum_order_quantity: input.minimum_order_quantity || null,
      minimum_order_unit: input.minimum_order_unit || null,
      lead_time_value: input.lead_time_value || null,
      lead_time_unit: input.lead_time_unit || null,
      notes: input.notes || null,
      recorded_by: userId,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
