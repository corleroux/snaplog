/**
 * Event Dashboard Component
 *
 * Displays overview statistics for an event plus navigation to analytics panels:
 * - Capture Progress Metrics
 * - Extraction Quality Report
 * - Vendor Attendance List
 *
 * Inline panels:
 * - Team Productivity
 * - Vendor Comparison
 */

import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useEventStats } from './hooks/useEventStats'
import { useTeamProductivity } from './hooks/useTeamProductivity'
import { useVendorComparisonStats } from './hooks/useVendorComparisonStats'
import { AppFrame, AppFrameContent, AppHeader } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { TeamProductivity } from './TeamProductivity'
import { VendorComparison } from './VendorComparison'
import type { ProductivityTimeRange } from './api/teamProductivity'

interface StatCardProps {
  title: string
  value: number
  icon?: React.ReactNode
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

interface NavCardProps {
  title: string
  description: string
  href: string
}

function NavCard({ title, description, href }: NavCardProps) {
  return (
    <Link to={href}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export function EventDashboard() {
  const { eventId } = useParams<{ eventId: string }>()
  const [timeRange, setTimeRange] = useState<ProductivityTimeRange>('week')

  const { data: stats, isLoading, error } = useEventStats(eventId || '')
  const { data: productivityData = [] } = useTeamProductivity(eventId || '', timeRange)
  const { data: vendorStats = [] } = useVendorComparisonStats(eventId || '')

  if (isLoading) {
    return (
      <AppFrame>
        <AppFrameContent>
          <LoadingState message="Loading event statistics..." />
        </AppFrameContent>
      </AppFrame>
    )
  }

  if (error) {
    return (
      <AppFrame>
        <AppFrameContent>
          <ErrorState
            title="Failed to load statistics"
            message={error.message}
            onRetry={() => window.location.reload()}
          />
        </AppFrameContent>
      </AppFrame>
    )
  }

  if (!stats) {
    return (
      <AppFrame>
        <AppFrameContent>
          <ErrorState
            title="No statistics available"
            message="Unable to load event statistics."
          />
        </AppFrameContent>
      </AppFrame>
    )
  }

  const completionPercentage =
    stats.totalVendors > 0
      ? Math.round((stats.completedVendors / stats.totalVendors) * 100)
      : 0

  const analyticsBase = `/events/${eventId}/analytics`

  return (
    <AppFrame>
      <AppHeader title="Event Dashboard" />
      <AppFrameContent>
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Vendors" value={stats.totalVendors} />
            <StatCard title="Total Styles" value={stats.totalStyles} />
            <StatCard title="Total Images" value={stats.totalImages} />
            <StatCard
              title="Completed Vendors"
              value={stats.completedVendors}
            />
          </div>

          {/* Progress Section */}
          <Card>
            <CardHeader>
              <CardTitle>Capture Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Overall Completion
                  </span>
                  <span className="font-medium">{completionPercentage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.totalVendors}</p>
                  <p className="text-xs text-muted-foreground">Vendors</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.totalStyles}</p>
                  <p className="text-xs text-muted-foreground">Styles</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.totalImages}</p>
                  <p className="text-xs text-muted-foreground">Images</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Panel Navigation */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Analytics Panels
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <NavCard
                title="Capture Progress"
                description="Detailed breakdown by team member with time estimates"
                href={`${analyticsBase}/capture-progress`}
              />
              <NavCard
                title="Extraction Quality"
                description="AI confidence scores and low-confidence field alerts"
                href={`${analyticsBase}/extraction-quality`}
              />
              <NavCard
                title="Vendor Attendance"
                description="Captured vs not-captured vendors with CSV export"
                href={`${analyticsBase}/vendor-attendance`}
              />
            </div>
          </div>

          {/* Team Productivity Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Team Productivity</CardTitle>
            </CardHeader>
            <CardContent>
              <TeamProductivity
                eventId={eventId || ''}
                productivityData={productivityData}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
              />
            </CardContent>
          </Card>

          {/* Vendor Comparison Panel */}
          {vendorStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Vendor Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <VendorComparison vendors={vendorStats} />
              </CardContent>
            </Card>
          )}
        </div>
      </AppFrameContent>
    </AppFrame>
  )
}
