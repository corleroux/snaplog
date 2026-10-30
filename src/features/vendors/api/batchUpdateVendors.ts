/**
 * Batch Operations for Vendors
 *
 * Functions for performing bulk updates on multiple vendors.
 */

import { supabase } from '@/lib/supabase/client'

export interface BatchArchiveInput {
  vendorIds: string[]
}

export interface BatchUpdateCategoryInput {
  vendorIds: string[]
  category: string
}

export interface BatchTagInput {
  vendorIds: string[]
  tags: string[]
}

/**
 * Archive multiple vendors (soft delete).
 */
export async function batchArchiveVendors({
  vendorIds,
}: BatchArchiveInput): Promise<void> {
  const { error } = await supabase
    .from('vendors')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', vendorIds)

  if (error) {
    throw new Error(`Failed to archive vendors: ${error.message}`)
  }
}

/**
 * Update category for multiple vendors.
 */
export async function batchUpdateVendorCategory({
  vendorIds,
  category,
}: BatchUpdateCategoryInput): Promise<void> {
  const { error } = await supabase
    .from('vendors')
    .update({ category })
    .in('id', vendorIds)

  if (error) {
    throw new Error(`Failed to update vendor categories: ${error.message}`)
  }
}

/**
 * Add tags to multiple vendors.
 * Note: This replaces existing tags. For appending, fetch first then merge.
 */
export async function batchTagVendors({
  vendorIds,
  tags,
}: BatchTagInput): Promise<void> {
  // For simplicity, this just sets the tags. In a real implementation,
  // you might want to fetch existing tags first and merge them.
  const { error } = await supabase
    .from('vendors')
    .update({ tags })
    .in('id', vendorIds)

  if (error) {
    throw new Error(`Failed to tag vendors: ${error.message}`)
  }
}

/**
 * Export multiple vendors to CSV format.
 */
export async function batchExportVendors({
  vendorIds,
}: BatchArchiveInput): Promise<string> {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, category, contact_name, email, phone, booth_number, notes')
    .in('id', vendorIds)

  if (error) {
    throw new Error(`Failed to export vendors: ${error.message}`)
  }

  // Convert to CSV
  const headers = ['ID', 'Name', 'Category', 'Contact', 'Email', 'Phone', 'Booth', 'Notes']
  const rows = (data || []).map((v: any) => [
    v.id,
    v.name,
    v.category || '',
    v.contact_name || '',
    v.email || '',
    v.phone || '',
    v.booth_number || '',
    v.notes || '',
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')

  return csv
}
