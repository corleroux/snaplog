/**
 * Duplicate Vendor Check
 *
 * Checks if a vendor with the same company name already exists
 * for the same event. Uses case-insensitive matching.
 *
 * IMPORTANT: This check is advisory only — it never blocks a commit.
 * If the check itself fails (network error, etc.), it returns false
 * so the flow can proceed.
 */

import { supabase } from '@/lib/supabase/client'
import type { Vendor } from '@/lib/supabase/types'
import { createLogger } from '@/lib/logger'

const log = createLogger('checkDuplicateVendor')

export interface DuplicateVendorCheckResult {
  isDuplicate: boolean
  existingVendors: Vendor[]
}

export async function checkDuplicateVendor(params: {
  companyName: string
  eventId: string
  excludeVendorId?: string
}): Promise<DuplicateVendorCheckResult> {
  if (!params.companyName || !params.companyName.trim()) {
    return { isDuplicate: false, existingVendors: [] }
  }

  const query = supabase
    .from('vendors')
    .select('*')
    .eq('event_id', params.eventId)
    .ilike('company_name', params.companyName.trim())
    .neq('status', 'archived')

  if (params.excludeVendorId) {
    query.neq('id', params.excludeVendorId)
  }

  const { data, error } = await query

  if (error) {
    // Don't block commit on check failure — log and proceed
    log.warn('Duplicate vendor check failed', { error: error.message })
    return { isDuplicate: false, existingVendors: [] }
  }

  if (data && data.length > 0) {
    return { isDuplicate: true, existingVendors: data }
  }

  return { isDuplicate: false, existingVendors: [] }
}
