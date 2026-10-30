/**
 * Vendor Attendance List Component
 *
 * Displays captured vs not captured vendors with category filtering
 * and export functionality.
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useVendorAttendance } from './hooks/useVendorAttendance'
import { AppFrame, AppFrameContent, AppHeader } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/button'

interface AttendanceListProps {
  vendors: Array<{
    id: string
    name: string
    category: string | null
    booth_number: string | null
    styles_count: number
  }>
  title: string
  emptyMessage: string
}

function AttendanceList({ vendors, title, emptyMessage }: AttendanceListProps) {
  if (vendors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg">{title}</h3>
      <div className="space-y-1">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex-1">
              <p className="font-medium">{vendor.name}</p>
              <p className="text-sm text-muted-foreground">
                {vendor.booth_number && `Booth ${vendor.booth_number}`}
                {vendor.booth_number && vendor.category && ' • '}
                {vendor.category}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {vendor.styles_count} style{vendor.styles_count !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function VendorAttendanceList() {
  const { eventId } = useParams<{ eventId: string }>()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  )

  const { data: attendance, isLoading, error } = useVendorAttendance(
    eventId || '',
    selectedCategory ? { category: selectedCategory } : undefined
  )

  // Extract unique categories from vendors
  const categories = Array.from(
    new Set([
      ...(attendance?.captured.map((v) => v.category).filter(Boolean) || []),
      ...(attendance?.not_captured.map((v) => v.category).filter(Boolean) || []),
    ])
  )

  const handleExport = () => {
    if (!attendance) return

    // Create CSV content
    const headers = ['Name', 'Category', 'Booth Number', 'Status', 'Styles Count']
    const rows = [
      ...attendance.captured.map((v) => [
        v.name,
        v.category || '',
        v.booth_number || '',
        'Captured',
        v.styles_count.toString(),
      ]),
      ...attendance.not_captured.map((v) => [
        v.name,
        v.category || '',
        v.booth_number || '',
        'Not Captured',
        v.styles_count.toString(),
      ]),
    ]

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n')

    // Download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendor-attendance-${eventId || 'event'}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <AppFrame>
        <AppFrameContent>
          <LoadingState message="Loading vendor attendance..." />
        </AppFrameContent>
      </AppFrame>
    )
  }

  if (error) {
    return (
      <AppFrame>
        <AppFrameContent>
          <ErrorState
            title="Failed to load attendance"
            message={error.message}
            onRetry={() => window.location.reload()}
          />
        </AppFrameContent>
      </AppFrame>
    )
  }

  if (!attendance) {
    return (
      <AppFrame>
        <AppFrameContent>
          <ErrorState
            title="No attendance data"
            message="Unable to load vendor attendance."
          />
        </AppFrameContent>
      </AppFrame>
    )
  }

  const completionPercentage =
    attendance.total > 0
      ? Math.round((attendance.captured_count / attendance.total) * 100)
      : 0

  return (
    <AppFrame>
      <AppHeader
        title="Vendor Attendance"
        rightAction={
          <Button variant="outline" size="sm" onClick={handleExport}>
            Export CSV
          </Button>
        }
      />
      <AppFrameContent>
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{attendance.total}</p>
                  <p className="text-xs text-muted-foreground">Total Vendors</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">
                    {attendance.captured_count}
                  </p>
                  <p className="text-xs text-muted-foreground">Captured</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-orange-600">
                    {attendance.total - attendance.captured_count}
                  </p>
                  <p className="text-xs text-muted-foreground">Not Captured</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-medium">{completionPercentage}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-green-600 transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedCategory ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(undefined)}
              >
                All Categories
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category || undefined)}
                >
                  {category || 'Uncategorized'}
                </Button>
              ))}
            </div>
          )}

          {/* Attendance Lists */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">
                  Captured ({attendance.captured_count})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceList
                  vendors={attendance.captured}
                  title=""
                  emptyMessage="No vendors captured yet."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600">
                  Not Captured ({attendance.total - attendance.captured_count})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AttendanceList
                  vendors={attendance.not_captured}
                  title=""
                  emptyMessage="All vendors captured!"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </AppFrameContent>
    </AppFrame>
  )
}
