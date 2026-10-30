import { useState, useEffect, useCallback } from 'react'
import { AppShell, PageHeader } from '@/components/layout'
import { LoadingState, ErrorState } from '@/components/ui'
import { ScheduledReportsManager } from '@/features/reports/ScheduledReportsManager'
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  type ScheduledReport,
} from '@/features/reports/api/scheduledReports'

interface EventSettingsScreenProps {
  eventId: string
  onBack: () => void
}

export function EventSettingsScreen({ eventId, onBack }: EventSettingsScreenProps) {
  const [reports, setReports] = useState<ScheduledReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getScheduledReports(eventId)
      setReports(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setIsLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader title="Event Settings" subtitle="Scheduled Reports" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <LoadingState message="Loading reports..." />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Event Settings" subtitle="Scheduled Reports" onBack={onBack} />
        <div className="flex-1 flex items-center justify-center">
          <ErrorState
            title="Failed to load reports"
            message={error}
            onRetry={fetchReports}
          />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <PageHeader title="Event Settings" subtitle="Scheduled Reports" onBack={onBack} />
      <main className="flex-1 overflow-y-auto px-4 pt-3">
        <ScheduledReportsManager
          eventId={eventId}
          reports={reports}
          onCreateReport={async (config) => {
            await createScheduledReport(
              config.name,
              config.description,
              eventId,
              config.reportConfig,
              config.scheduleType,
              config.scheduleHour,
              config.recipients,
              config.options
            )
            await fetchReports()
          }}
          onUpdateReport={async (reportId, updates) => {
            await updateScheduledReport(reportId, updates)
            await fetchReports()
          }}
          onDeleteReport={async (reportId) => {
            await deleteScheduledReport(reportId)
            await fetchReports()
          }}
        />
      </main>
    </AppShell>
  )
}
