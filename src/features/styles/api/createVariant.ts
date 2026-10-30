/**
 * Create Variant API
 *
 * Creates a new fabric variant for a style.
 * Follows existing patterns from updateVariant and addPriceHistory.
 */

import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'
import type { FabricVariant } from '@/lib/supabase/types'

export interface CreateVariantInput {
  styleId: string
  eventId: string
  vendorId: string
  color_name?: string | null
  color_code?: string | null
  variant_name?: string | null
  wash_code?: string | null
  finish_override?: string | null
}

/**
 * Create a new fabric variant.
 *
 * @returns The created variant
 */
export async function createVariant(input: CreateVariantInput): Promise<FabricVariant> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('fabric_variants')
    .insert({
      style_id: input.styleId,
      event_id: input.eventId,
      vendor_id: input.vendorId,
      color_name: input.color_name || null,
      color_code: input.color_code || null,
      variant_name: input.variant_name || null,
      wash_code: input.wash_code || null,
      finish_override: input.finish_override || null,
      status: 'active',
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
