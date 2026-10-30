/**
 * Saved Reports API
 *
 * Functions for managing custom analytics report configurations.
 */

import { supabase } from '@/lib/supabase/client'
import type { SavedReport } from '../types/reports'

/**
 * Save a new report configuration
 *
 * @param report - Report configuration to save
 * @returns Promise resolving to the created report
 */
export async function saveReport(
  report: Omit<
    SavedReport,
    'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'
  >
): Promise<SavedReport> {
  const { data, error } = await supabase
    .from('saved_reports')
    .insert({
      name: report.name,
      description: report.description,
      event_id: report.event_id,
      config: report.config,
      report_type: report.report_type,
      schedule_interval: report.schedule_interval,
      schedule_recipient: report.schedule_recipient,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to save report: ${error.message}`)
  }

  return data as SavedReport
}

/**
 * Get all saved reports for the current user
 *
 * @param eventId - Optional event ID to filter by
 * @returns Promise resolving to array of saved reports
 */
export async function getSavedReports(
  eventId?: string
): Promise<SavedReport[]> {
  let query = supabase.from('saved_reports').select('*')

  // Apply event filter first, before ordering
  if (eventId) {
    query = query.eq('event_id', eventId) as any
  }

  // Then order the results
  query = query.order('created_at', { ascending: false }) as any

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch saved reports: ${error.message}`)
  }

  return (data as SavedReport[]) || []
}

/**
 * Get a single report by ID
 *
 * @param reportId - The ID of the report
 * @returns Promise resolving to the report or null if not found
 */
export async function getReportById(
  reportId: string
): Promise<SavedReport | null> {
  const { data, error } = await supabase
    .from('saved_reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (error) {
    return null
  }

  return data as SavedReport
}

/**
 * Delete a report (soft delete)
 *
 * @param reportId - The ID of the report to delete
 * @returns Promise resolving when deleted
 */
export async function deleteReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_reports')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', reportId)
    .single()

  if (error) {
    throw new Error(`Failed to delete report: ${error.message}`)
  }
}

/**
 * Update an existing report
 *
 * @param reportId - The ID of the report to update
 * @param updates - Fields to update
 * @returns Promise resolving to the updated report
 */
export async function updateReport(
  reportId: string,
  updates: Partial<
    Pick<SavedReport, 'name' | 'description' | 'config' | 'schedule_interval' | 'schedule_recipient'>
  >
): Promise<SavedReport> {
  const { data, error } = await supabase
    .from('saved_reports')
    .update(updates)
    .eq('id', reportId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update report: ${error.message}`)
  }

  return data as SavedReport
}
