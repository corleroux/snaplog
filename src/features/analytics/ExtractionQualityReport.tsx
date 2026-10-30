/**
 * Extraction Quality Report Component
 *
 * Displays AI extraction quality metrics including:
 * - Average confidence per field
 * - Low confidence alerts
 * - Field accuracy tracking
 */

import { useParams } from 'react-router-dom'
import { useExtractionQuality } from './hooks/useExtractionQuality'
import { AppFrame, AppFrameContent, AppHeader } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Badge } from '@/components/ui/badge'

export function ExtractionQualityReport() {
  const { eventId } = useParams<{ eventId: string }>()
  const { data: quality, isLoading, error } = useExtractionQuality(
    eventId || ''
  )

  if (isLoading) {
    return (
      <AppFrame>
        <AppFrameContent>
          <LoadingState message="Loading extraction quality..." />
        </AppFrameContent>
      </AppFrame>
    )
  }

  if (error) {
    return (
      <AppFrame>
        <AppFrameContent>
          <ErrorState
            title="Failed to load quality metrics"
            message={error.message}
            onRetry={() => window.location.reload()}
          />
        </AppFrameContent>
      </AppFrame>
    )
  }

  if (!quality) {
    return (
      <AppFrame>
        <AppFrameContent>
          <ErrorState
            title="No quality data"
            message="Unable to load extraction quality metrics."
          />
        </AppFrameContent>
      </AppFrame>
    )
  }

  const overallPercentage = Math.round(quality.average_confidence * 100)
  const fieldEntries = Object.entries(quality.field_confidence).sort(
    (a, b) => a[0].localeCompare(b[0])
  )

  return (
    <AppFrame>
      <AppHeader title="Extraction Quality" />
      <AppFrameContent>
        <div className="space-y-6">
          {/* Overall Quality Card */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Extraction Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Confidence */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Average Confidence
                  </span>
                  <span className="font-medium">{overallPercentage}%</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all duration-300 ${
                      quality.average_confidence < 0.5
                        ? 'bg-yellow-600'
                        : quality.average_confidence < 0.7
                          ? 'bg-orange-500'
                          : 'bg-green-600'
                    }`}
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{quality.total_extractions}</p>
                  <p className="text-xs text-muted-foreground">Extractions</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-yellow-600">
                    {quality.low_confidence_count}
                  </p>
                  <p className="text-xs text-muted-foreground">Low (&lt;50%)</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-red-600">
                    {quality.critical_confidence_count}
                  </p>
                  <p className="text-xs text-muted-foreground">Critical (&lt;30%)</p>
                </div>
              </div>

              {/* Alert Badges */}
              {(quality.low_confidence_count > 0 ||
                quality.critical_confidence_count > 0) && (
                <div className="flex flex-wrap gap-2">
                  {quality.critical_confidence_count > 0 && (
                    <Badge variant="destructive">
                      {quality.critical_confidence_count} critical field
                      {quality.critical_confidence_count !== 1 ? 's' : ''}{' '}
                      need review
                    </Badge>
                  )}
                  {quality.low_confidence_count > 0 && (
                    <Badge variant="secondary" className="border-yellow-600 text-yellow-700">
                      {quality.low_confidence_count} field
                      {quality.low_confidence_count !== 1 ? 's' : ''} with low
                      confidence
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Field-Level Quality */}
          {fieldEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Confidence by Field</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fieldEntries.map(([field, stats]) => (
                  <div key={field} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{field}</span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>
                          avg: {Math.round(stats.avg * 100)}% • min:{' '}
                          {Math.round(stats.min * 100)}% • max:{' '}
                          {Math.round(stats.max * 100)}%
                        </span>
                        <Badge variant="outline">{stats.count} values</Badge>
                      </div>
                    </div>

                    {/* Individual confidence bars for this field */}
                    <div className="space-y-2">
                      <div className="relative h-6 overflow-hidden rounded-full bg-secondary">
                        {/* Min range */}
                        <div
                          className="absolute left-0 top-0 h-full bg-blue-300/30"
                          style={{ width: `${stats.min * 100}%` }}
                        />
                        {/* Max range */}
                        <div
                          className="absolute left-0 top-0 h-full bg-blue-500/30"
                          style={{ width: `${stats.max * 100}%` }}
                        />
                        {/* Average indicator */}
                        <div
                          className="absolute top-0 h-full w-1 bg-primary"
                          style={{ left: `${stats.avg * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Min: {Math.round(stats.min * 100)}%</span>
                        <span>Avg: {Math.round(stats.avg * 100)}%</span>
                        <span>Max: {Math.round(stats.max * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {fieldEntries.length === 0 && quality.total_extractions === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No extraction data available yet. Complete some captures to see
                quality metrics.
              </CardContent>
            </Card>
          )}
        </div>
      </AppFrameContent>
    </AppFrame>
  )
}
