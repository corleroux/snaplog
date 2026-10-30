/**
 * Capture Progress Metrics Component
 *
 * Displays progress bar, captures per user, and time remaining estimate.
 */

import { useParams } from 'react-router-dom'
import { useCaptureProgress } from './hooks/useCaptureProgress'
import { AppFrame, AppFrameContent, AppHeader } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return 'N/A'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function CaptureProgressMetrics() {
  const { eventId } = useParams<{ eventId: string }>()
  const { data: progress, isLoading, error } = useCaptureProgress(
    eventId || ''
  )

  if (isLoading) {
    return (
      <AppFrame>
        <AppFrameContent>
          <LoadingState message="Loading capture progress..." />
        </AppFrameContent>
      </AppFrame>
    )
  }

  if (error) {
    return (
      <AppFrame>
        <AppFrameContent>
          <ErrorState
            title="Failed to load progress"
            message={error.message}
            onRetry={() => window.location.reload()}
          />
        </AppFrameContent>
      </AppFrame>
    )
  }

  if (!progress) {
    return (
      <AppFrame>
        <AppFrameContent>
          <ErrorState
            title="No progress data"
            message="Unable to load capture progress."
          />
        </AppFrameContent>
      </AppFrame>
    )
  }

  return (
    <AppFrame>
      <AppHeader title="Capture Progress" />
      <AppFrameContent>
        <div className="space-y-6">
          {/* Overall Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{progress.completion_percentage}%</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${progress.completion_percentage}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{progress.total_vendors}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">
                    {progress.captured_vendors}
                  </p>
                  <p className="text-xs text-muted-foreground">Captured</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-orange-600">
                    {progress.remaining_vendors}
                  </p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
              </div>

              {/* Time Estimate */}
              {progress.estimated_remaining_minutes !== null && (
                <div className="rounded-lg bg-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    Estimated time remaining
                  </p>
                  <p className="text-2xl font-bold">
                    {formatMinutes(progress.estimated_remaining_minutes)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Captures Per User */}
          {progress.captures_per_user.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Captures Per Team Member</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progress.captures_per_user.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {user.user_email || 'Unknown User'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.captured_count} vendor
                          {user.captured_count !== 1 ? 's' : ''} captured
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {user.captured_count}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </AppFrameContent>
    </AppFrame>
  )
}
