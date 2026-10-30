import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'
import type { PriceHistory } from '@/lib/supabase/types'

/**
 * Price history insert interface.
 *
 * Contains all fields needed to create a new price_history entry.
 * Each save creates a new entry to preserve audit trail.
 */
export interface PriceHistoryInsert {
  style_id: string
  event_id: string
  vendor_id: string
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
 * Add a new price history entry.
 *
 * This function creates a new price_history record.
 * Each save creates a new entry to preserve audit trail.
 *
 * @param priceData - The price history data to insert
 * @returns The created price history record
 * @throws Error if insertion fails
 */
export async function addPriceHistory(
  priceData: PriceHistoryInsert
): Promise<PriceHistory> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('price_history')
    .insert({
      ...priceData,
      recorded_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
