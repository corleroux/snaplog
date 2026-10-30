import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'

/**
 * Update multiple variants at once.
 *
 * This allows batch status changes or archiving of multiple variants.
 *
 * @param variantIds - Array of variant IDs to update
 * @param status - The new status to apply
 * @returns The number of updated variants
 */
export async function batchUpdateVariants(
  variantIds: string[],
  status: string
): Promise<number> {
  if (!variantIds.length) return 0

  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('fabric_variants')
    .update({
      status,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .in('id', variantIds)
    .select('id')

  if (error) {
    throw error
  }

  return data?.length || 0
}
