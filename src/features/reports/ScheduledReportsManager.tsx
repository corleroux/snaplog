/**
 * Scheduled Reports Manager Component
 *
 * Manages scheduled reports for an event.
 */

import { useState, useCallback } from 'react'
import { Calendar, Clock, Mail, Plus, Trash2, Play, Pause, FileText, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import type { ScheduledReport, ScheduleType, ReportConfig } from './api/scheduledReports'

interface ScheduledReportsManagerProps {
  /** Event ID */
  eventId: string
  /** Scheduled reports */
  reports: ScheduledReport[]
  /** Callback when a report is created */
  onCreateReport?: (config: {
    name: string
    description: string | null
    reportConfig: ReportConfig
    scheduleType: ScheduleType
    scheduleHour: number
    recipients: string[]
    options?: {
      scheduleDayOfWeek?: number
      scheduleDayOfMonth?: number
      timezone?: string
    }
  }) => Promise<void>
  /** Callback when a report is updated */
  onUpdateReport?: (reportId: string, updates: Partial<{
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
  }>) => Promise<void>
  /** Callback when a report is deleted */
  onDeleteReport?: (reportId: string) => Promise<void>
  /** Optional additional className */
  className?: string
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Format schedule description
 */
function formatScheduleDescription(report: ScheduledReport): string {
  const hour = report.scheduleHour % 12 || 12
  const ampm = report.scheduleHour < 12 ? 'AM' : 'PM'

  switch (report.scheduleType) {
    case 'daily':
      return `Daily at ${hour}:00 ${ampm}`
    case 'weekly':
      return `Weekly on ${DAYS_OF_WEEK[report.scheduleDayOfWeek || 0]} at ${hour}:00 ${ampm}`
    case 'monthly':
      return `Monthly on the ${report.scheduleDayOfMonth || 1}${getOrdinalSuffix(report.scheduleDayOfMonth || 1)} at ${hour}:00 ${ampm}`
    default:
      return 'Unknown schedule'
  }
}

/**
 * Get ordinal suffix for day
 */
function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

/**
 * Format date
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

/**
 * Scheduled Reports Manager Component
 *
 * Displays and manages scheduled reports for an event.
 */
export function ScheduledReportsManager({
  eventId: _eventId,
  reports,
  onCreateReport,
  onUpdateReport,
  onDeleteReport,
  className
}: ScheduledReportsManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  const handleToggleActive = useCallback(async (report: ScheduledReport) => {
    if (!onUpdateReport) return

    setIsSubmitting(true)
    try {
      await onUpdateReport(report.id, { isActive: !report.isActive })
      showToast({
        title: report.isActive ? 'Report paused' : 'Report activated',
        variant: 'success',
        duration: 3000
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update report'
      showToast({
        title: 'Update failed',
        description: message,
        variant: 'error',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [onUpdateReport, showToast])

  const handleDelete = useCallback(async (reportId: string) => {
    if (!onDeleteReport) return
    if (!confirm('Are you sure you want to delete this scheduled report?')) return

    setIsSubmitting(true)
    try {
      await onDeleteReport(reportId)
      showToast({
        title: 'Report deleted',
        variant: 'success',
        duration: 3000
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete report'
      showToast({
        title: 'Delete failed',
        description: message,
        variant: 'error',
        duration: 5000
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [onDeleteReport, showToast])

  const activeReports = reports.filter(r => r.isActive)
  const inactiveReports = reports.filter(r => !r.isActive)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Scheduled Reports</h3>
          <p className="text-sm text-muted-foreground">
            {activeReports.length} active report{activeReports.length !== 1 ? 's' : ''}
          </p>
        </div>
        {onCreateReport && (
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
            disabled={isCreating}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Schedule
          </Button>
        )}
      </div>

      {/* Active reports */}
      {activeReports.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Active Reports</h4>
          {activeReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onToggleActive={() => handleToggleActive(report)}
              onDelete={() => handleDelete(report.id)}
              isSubmitting={isSubmitting}
              showActiveBadge
            />
          ))}
        </div>
      )}

      {/* Inactive reports */}
      {inactiveReports.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Paused Reports</h4>
          {inactiveReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onToggleActive={() => handleToggleActive(report)}
              onDelete={() => handleDelete(report.id)}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {reports.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No scheduled reports</p>
          <p className="text-xs mt-1">Create a schedule to automatically generate reports</p>
        </div>
      )}

      {/* Note about dependencies */}
      {(onCreateReport || onUpdateReport || onDeleteReport) && (
        <div className="flex gap-2 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            Scheduled reports require email notifications (T1.12) and the edge function to be deployed.
            Reports will be generated according to the schedule and sent to the specified recipients.
          </p>
        </div>
      )}
    </div>
  )
}

interface ReportCardProps {
  report: ScheduledReport
  onToggleActive: () => void
  onDelete: () => void
  isSubmitting: boolean
  showActiveBadge?: boolean
}

function ReportCard({ report, onToggleActive, onDelete, isSubmitting, showActiveBadge }: ReportCardProps) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{report.name}</h4>
            {showActiveBadge && (
              <Badge variant="outline" className="text-green-600 dark:text-green-400">
                Active
              </Badge>
            )}
          </div>
          {report.description && (
            <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleActive}
            disabled={isSubmitting}
            title={report.isActive ? 'Pause report' : 'Activate report'}
          >
            {report.isActive ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={isSubmitting}
            title="Delete report"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Schedule info */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>{formatScheduleDescription(report)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>Next run: {formatDate(report.nextRunAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Mail className="h-4 w-4" />
          <span>{report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Last run info */}
      {report.lastRunAt && (
        <div className="text-xs text-muted-foreground">
          Last run: {formatDate(report.lastRunAt)}
        </div>
      )}
    </div>
  )
}
