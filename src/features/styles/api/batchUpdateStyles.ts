/**
 * Batch Operations for Styles
 *
 * Functions for performing bulk updates on multiple styles.
 */

import { supabase } from '@/lib/supabase/client'

export interface BatchArchiveInput {
  styleIds: string[]
}

export interface BatchUpdateSeasonInput {
  styleIds: string[]
  season: string
}

export interface BatchUpdateStatusInput {
  styleIds: string[]
  status: 'draft' | 'pending_review' | 'committed'
}

/**
 * Archive multiple styles (soft delete).
 */
export async function batchArchiveStyles({
  styleIds,
}: BatchArchiveInput): Promise<void> {
  const { error } = await supabase
    .from('fabric_styles')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', styleIds)

  if (error) {
    throw new Error(`Failed to archive styles: ${error.message}`)
  }
}

/**
 * Update season for multiple styles.
 */
export async function batchUpdateStyleSeason({
  styleIds,
  season,
}: BatchUpdateSeasonInput): Promise<void> {
  const { error } = await supabase
    .from('fabric_styles')
    .update({ season })
    .in('id', styleIds)

  if (error) {
    throw new Error(`Failed to update style seasons: ${error.message}`)
  }
}

/**
 * Update status for multiple styles.
 */
export async function batchUpdateStyleStatus({
  styleIds,
  status,
}: BatchUpdateStatusInput): Promise<void> {
  const { error } = await supabase
    .from('fabric_styles')
    .update({ status })
    .in('id', styleIds)

  if (error) {
    throw new Error(`Failed to update style status: ${error.message}`)
  }
}

/**
 * Export multiple styles to CSV format.
 */
export async function batchExportStyles({
  styleIds,
}: BatchArchiveInput): Promise<string> {
  const { data, error } = await supabase
    .from('fabric_styles')
    .select(`
      id,
      name,
      category,
      season,
      status,
      description,
      vendor:vendors(name)
    `)
    .in('id', styleIds)

  if (error) {
    throw new Error(`Failed to export styles: ${error.message}`)
  }

  // Convert to CSV
  const headers = ['ID', 'Name', 'Category', 'Season', 'Status', 'Description', 'Vendor']
  const rows = (data || []).map((s: any) => [
    s.id,
    s.name,
    s.category || '',
    s.season || '',
    s.status || '',
    s.description || '',
    s.vendor?.name || '',
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')

  return csv
}
