import { supabase } from '@/lib/supabase/client'
import type { Vendor } from '@/lib/supabase/types'

/**
 * Fetch a single vendor by ID.
 *
 * RLS is handled by Supabase policies in the database.
 *
 * @param vendorId - The vendor ID
 * @returns The vendor data
 */
export async function getVendor(vendorId: string): Promise<Vendor> {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single()

  if (error) {
    throw error
  }

  return data
}
