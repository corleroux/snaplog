/**
 * Scheduled Reports API Functions
 *
 * Functions for managing scheduled reports.
 */

import { supabase } from '@/lib/supabase/client'

export type ScheduleType = 'daily' | 'weekly' | 'monthly'

export interface ScheduledReport {
  id: string
  name: string
  description: string | null
  eventId: string
  createdById: string
  createdByEmail: string
  createdByName: string | null
  reportConfig: ReportConfig
  scheduleType: ScheduleType
  scheduleDayOfWeek: number | null
  scheduleDayOfMonth: number | null
  scheduleHour: number
  timezone: string
  recipients: string[]
  isActive: boolean
  lastRunAt: string | null
  nextRunAt: string
  createdAt: string
  updatedAt: string
}

export interface ReportConfig {
  dimensions: string[]
  metrics: string[]
  filters: Record<string, unknown>
  timeRange: string
}

export interface ReportRun {
  id: string
  scheduledReportId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt: string | null
  errorMessage: string | null
  fileUrl: string | null
  recipientCount: number | null
  createdAt: string
}

/**
 * Get scheduled reports for an event
 */
export async function getScheduledReports(eventId: string): Promise<ScheduledReport[]> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    eventId: item.event_id,
    createdById: item.created_by,
    createdByEmail: '', // Will be populated if needed
    createdByName: null,
    reportConfig: item.report_config as ReportConfig,
    scheduleType: item.schedule_type as ScheduleType,
    scheduleDayOfWeek: item.schedule_day_of_week,
    scheduleDayOfMonth: item.schedule_day_of_month,
    scheduleHour: item.schedule_hour,
    timezone: item.timezone,
    recipients: item.recipients,
    isActive: item.is_active,
    lastRunAt: item.last_run_at,
    nextRunAt: item.next_run_at,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }))
}

/**
 * Get a scheduled report by ID
 */
export async function getScheduledReport(reportId: string): Promise<ScheduledReport | null> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    eventId: data.event_id,
    createdById: data.created_by,
    createdByEmail: '',
    createdByName: null,
    reportConfig: data.report_config as ReportConfig,
    scheduleType: data.schedule_type as ScheduleType,
    scheduleDayOfWeek: data.schedule_day_of_week,
    scheduleDayOfMonth: data.schedule_day_of_month,
    scheduleHour: data.schedule_hour,
    timezone: data.timezone,
    recipients: data.recipients,
    isActive: data.is_active,
    lastRunAt: data.last_run_at,
    nextRunAt: data.next_run_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

/**
 * Create a scheduled report
 */
export async function createScheduledReport(
  name: string,
  description: string | null,
  eventId: string,
  reportConfig: ReportConfig,
  scheduleType: ScheduleType,
  scheduleHour: number,
  recipients: string[],
  options?: {
    scheduleDayOfWeek?: number
    scheduleDayOfMonth?: number
    timezone?: string
  }
): Promise<string> {
  const { data, error } = await supabase.rpc('create_scheduled_report', {
    p_name: name,
    p_description: description,
    p_event_id: eventId,
    p_report_config: reportConfig,
    p_schedule_type: scheduleType,
    p_day_of_week: options?.scheduleDayOfWeek || null,
    p_day_of_month: options?.scheduleDayOfMonth || null,
    p_hour: scheduleHour,
    p_timezone: options?.timezone || 'UTC',
    p_recipients: recipients
  })

  if (error) throw error
  return data
}

/**
 * Update a scheduled report
 */
export async function updateScheduledReport(
  reportId: string,
  updates: Partial<{
    name: string
    description: string
    reportConfig: ReportConfig
    scheduleType: ScheduleType
    scheduleDayOfWeek: number
    scheduleDayOfMonth: number
    scheduleHour: number
    timezone: string
    recipients: string[]
    isActive: boolean
  }>
): Promise<void> {
  const updateData: Record<string, unknown> = { ...updates }

  // Handle field name mapping
  if (updates.scheduleDayOfWeek !== undefined) {
    updateData.schedule_day_of_week = updates.scheduleDayOfWeek
    delete updateData.scheduleDayOfWeek
  }
  if (updates.scheduleDayOfMonth !== undefined) {
    updateData.schedule_day_of_month = updates.scheduleDayOfMonth
    delete updateData.scheduleDayOfMonth
  }
  if (updates.scheduleHour !== undefined) {
    updateData.schedule_hour = updates.scheduleHour
    delete updateData.scheduleHour
  }
  if (updates.isActive !== undefined) {
    updateData.is_active = updates.isActive
    delete updateData.isActive
  }

  const { error } = await supabase
    .from('scheduled_reports')
    .update(updateData)
    .eq('id', reportId)

  if (error) throw error
}

/**
 * Delete a scheduled report
 */
export async function deleteScheduledReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_reports')
    .delete()
    .eq('id', reportId)

  if (error) throw error
}

/**
 * Get report runs for a scheduled report
 */
export async function getReportRuns(scheduledReportId: string, limit = 10): Promise<ReportRun[]> {
  const { data, error } = await supabase
    .from('report_runs')
    .select('*')
    .eq('scheduled_report_id', scheduledReportId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []).map((item: any) => ({
    id: item.id,
    scheduledReportId: item.scheduled_report_id,
    status: item.status,
    startedAt: item.started_at,
    completedAt: item.completed_at,
    errorMessage: item.error_message,
    fileUrl: item.file_url,
    recipientCount: item.recipient_count,
    createdAt: item.created_at
  }))
}

/**
 * Subscribe to scheduled report changes
 */
export function subscribeToScheduledReports(
  eventId: string,
  callback: (report: ScheduledReport) => void
): () => void {
  const channel = supabase
    .channel(`scheduled_reports:${eventId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'scheduled_reports',
        filter: `event_id=eq.${eventId}`
      },
      async (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const report = await getScheduledReport((payload.new as any).id)
          if (report) {
            callback(report)
          }
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
