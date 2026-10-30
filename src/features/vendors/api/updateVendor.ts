import { supabase } from '@/lib/supabase/client'
import { getCurrentUserId } from '@/lib/supabase/auth'
import type { Vendor } from '@/lib/supabase/types'

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
 * Update vendor fields with optimistic concurrency control.
 *
 * This API updates committed vendor business records.
 * It does NOT modify scan_sessions audit payloads.
 *
 * Editable fields:
 * - company_name
 * - booth_number
 * - contact_person
 * - email
 * - phone
 * - whatsapp
 * - website_url
 * - address
 * - country_of_origin
 * - brand_names
 * - notes
 *
 * @param vendorId - The vendor ID to update
 * @param updates - The fields to update
 * @param expectedVersion - The version the caller expects (for optimistic concurrency)
 * @returns The updated vendor
 * @throws {ConcurrencyConflictError} if the record was modified by another user
 */
export async function updateVendor(
  vendorId: string,
  updates: VendorUpdate,
  expectedVersion: number
): Promise<Vendor> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('vendors')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: userId,
      version: expectedVersion + 1,
    })
    .eq('id', vendorId)
    .eq('version', expectedVersion)
    .select()
    .single()

  if (error) {
    throw error
  }

  if (!data) {
    throw new ConcurrencyConflictError('vendor', vendorId)
  }

  return data
}

/**
 * Vendor update type.
 * Only includes editable business fields.
 */
export interface VendorUpdate {
  company_name?: string
  booth_number?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  website_url?: string | null
  address?: string | null
  country_of_origin?: string | null
  brand_names?: string[] | null
  notes?: string | null
}
