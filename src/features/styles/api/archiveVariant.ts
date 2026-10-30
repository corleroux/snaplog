import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'
import type { FabricVariant } from '@/lib/supabase/types'

/**
 * Archive a fabric variant (soft-delete).
 *
 * Sets the status to 'discontinued' to hide it from the main UI
 * while preserving historical data.
 *
 * @param variantId - The ID of the variant to archive
 * @returns The updated FabricVariant
 */
export async function archiveVariant(variantId: string): Promise<FabricVariant> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('fabric_variants')
    .update({
      status: 'discontinued',
      updated_by: userId,
      updated_at: new Date().toISOString(),
      deleted_at: new Date().toISOString(),
    })
    .eq('id', variantId)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
