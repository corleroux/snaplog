import { supabase } from '@/lib/supabase/client'
import type { FabricStyle } from '@/lib/supabase/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('checkDuplicateStyle')

export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingStyle: FabricStyle | null
}

/**
 * Check if a style with the same item_code and vendor_id already exists.
 *
 * Returns the existing style if found, null otherwise.
 * Skips check if item_code is empty or null.
 */
export async function checkDuplicateStyle(params: {
  itemCode: string | null | undefined
  vendorId: string
  excludeStyleId?: string  // For edit flows, exclude the style being edited
}): Promise<DuplicateCheckResult> {
  if (!params.itemCode || !params.itemCode.trim()) {
    return { isDuplicate: false, existingStyle: null }
  }

  let query = supabase
    .from('fabric_styles')
    .select('*')
    .eq('item_code', params.itemCode.trim())
    .eq('vendor_id', params.vendorId)

  if (params.excludeStyleId) {
    query = query.neq('id', params.excludeStyleId)
  }

  // Only check active/hidden styles (not archived)
  query = query.neq('status', 'archived')

  const { data, error } = await query.maybeSingle()

  if (error) {
    // Don't block commit on check failure — just log and proceed
    log.warn('Duplicate check failed', { error: error.message })
    return { isDuplicate: false, existingStyle: null }
  }

  if (data) {
    return { isDuplicate: true, existingStyle: data as unknown as FabricStyle }
  }

  return { isDuplicate: false, existingStyle: null }
}
