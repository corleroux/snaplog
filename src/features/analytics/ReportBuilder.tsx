/**
 * Report Builder Component
 *
 * Allows users to create custom analytics reports by selecting
 * dimensions, metrics, filters, and save/export configurations.
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSavedReports, useSaveReport, useDeleteReport } from './hooks/useSavedReports'
import { useEventQuery } from '@/features/events'
import { AppFrame, AppFrameContent, AppHeader } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ReportDimension, ReportMetric, ReportConfig } from './types/reports'

const AVAILABLE_DIMENSIONS: { value: ReportDimension; label: string }[] = [
  { value: 'vendor', label: 'Vendor' },
  { value: 'category', label: 'Category' },
  { value: 'season', label: 'Season' },
  { value: 'status', label: 'Status' },
]

const AVAILABLE_METRICS: { value: ReportMetric; label: string }[] = [
  { value: 'count', label: 'Count' },
  { value: 'vendors_count', label: 'Vendors Count' },
  { value: 'styles_count', label: 'Styles Count' },
  { value: 'images_count', label: 'Images Count' },
  { value: 'avg_confidence', label: 'Avg Confidence' },
  { value: 'completion_percentage', label: 'Completion %' },
]

export function ReportBuilder() {
  const { eventId } = useParams<{ eventId: string }>()
  const { data: event } = useEventQuery(eventId || '')
  const { data: savedReports, isLoading: isLoadingReports } = useSavedReports(eventId)
  const saveReportMutation = useSaveReport()
  const deleteReportMutation = useDeleteReport()

  const [reportName, setReportName] = useState('')
  const [selectedDimensions, setSelectedDimensions] = useState<ReportDimension[]>([])
  const [selectedMetrics, setSelectedMetrics] = useState<ReportMetric[]>([])
  const [savedReportId, setSavedReportId] = useState<string | null>(null)

  const toggleDimension = (dim: ReportDimension) => {
    setSelectedDimensions((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    )
  }

  const toggleMetric = (metric: ReportMetric) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    )
  }

  const handleSaveReport = async () => {
    if (!reportName.trim() || selectedMetrics.length === 0) {
      return
    }

    const config: ReportConfig = {
      dimensions: selectedDimensions,
      metrics: selectedMetrics,
      filters: [],
    }

    await saveReportMutation.mutateAsync({
      name: reportName,
      description: `Custom report for ${event?.name || 'event'}`,
      event_id: eventId || null,
      config,
      report_type: 'custom',
      schedule_interval: null,
      schedule_recipient: null,
      last_scheduled_at: null,
    } as any)

    setReportName('')
    setSelectedDimensions([])
    setSelectedMetrics([])
  }

  const handleLoadReport = (report: any) => {
    setSavedReportId(report.id)
    setReportName(report.name)
    setSelectedDimensions(report.config.dimensions || [])
    setSelectedMetrics(report.config.metrics || [])
  }

  const handleDeleteReport = async (reportId: string) => {
    await deleteReportMutation.mutateAsync(reportId)
    if (savedReportId === reportId) {
      setSavedReportId(null)
    }
  }

  const handleExportCSV = () => {
    // Generate CSV export
    const headers = [
      ...selectedDimensions.map((d) => d.toUpperCase()),
      ...selectedMetrics.map((m) => m.toUpperCase()),
    ]

    const csv = [headers.join(',')]

    // Add sample data row
    const row = [
      ...selectedDimensions.map(() => 'Sample'),
      ...selectedMetrics.map(() => '0'),
    ]
    csv.push(row.join(','))

    const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${reportName || 'custom'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoadingReports) {
    return (
      <AppFrame>
        <AppFrameContent>
          <LoadingState message="Loading reports..." />
        </AppFrameContent>
      </AppFrame>
    )
  }

  return (
    <AppFrame>
      <AppHeader title="Report Builder" />
      <AppFrameContent>
        <div className="space-y-6">
          {/* Saved Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Saved Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {savedReports && savedReports.length > 0 ? (
                <div className="space-y-2">
                  {savedReports.map((report: any) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.config.dimensions?.length || 0} dimensions,{' '}
                          {report.config.metrics?.length || 0} metrics
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadReport(report)}
                        >
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No saved reports yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Builder */}
          <Card>
            <CardHeader>
              <CardTitle>
                {savedReportId ? 'Edit Report' : 'New Report'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Name */}
              <div>
                <label htmlFor="report-name" className="block text-sm font-medium mb-2">
                  Report Name
                </label>
                <input
                  id="report-name"
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                  placeholder="My Custom Report"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Group By (Dimensions)
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_DIMENSIONS.map((dim) => (
                    <Badge
                      key={dim.value}
                      variant={selectedDimensions.includes(dim.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleDimension(dim.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleDimension(dim.value)
                        }
                      }}
                    >
                      {dim.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Metrics */}
              <div>
                <label className="block text-sm font-medium mb-2">Metrics</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_METRICS.map((metric) => (
                    <Badge
                      key={metric.value}
                      variant={selectedMetrics.includes(metric.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleMetric(metric.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleMetric(metric.value)
                        }
                      }}
                    >
                      {metric.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveReport}
                  disabled={!reportName.trim() || selectedMetrics.length === 0}
                >
                  Save Report
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCSV}
                  disabled={selectedMetrics.length === 0}
                >
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppFrameContent>
    </AppFrame>
  )
}
