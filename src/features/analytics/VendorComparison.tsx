/**
 * Vendor Comparison Component
 *
 * Compares vendors side-by-side with statistics.
 * Supports multi-event comparison and export functionality.
 */

import { useState, useCallback, useMemo } from 'react'
import { ArrowRight, Download, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

export interface VendorStats {
  vendorId: string
  vendorName: string
  eventId: string
  eventName: string
  boothNumber?: string | null
  totalStyles: number
  totalVariants: number
  totalImages: number
  totalViews?: number
  totalExports?: number
  lastCapture?: string
  lastUpdate?: string
}

export interface VendorComparisonProps {
  /** Vendor stats to compare */
  vendors: VendorStats[]
  /** Available events for multi-event comparison */
  availableEvents?: Array<{ id: string; name: string }>
  /** Optional additional className */
  className?: string
}

interface ComparisonMetric {
  id: string
  label: string
  getValue: (vendor: VendorStats) => number | string
  unit?: string
  format?: (value: number | string) => string
  highlightBest?: 'highest' | 'lowest'
}

/**
 * Vendor Comparison Component
 *
 * Shows side-by-side comparison of vendors with statistics.
 * Allows adding/removing vendors from comparison.
 */
export function VendorComparison({
  vendors,
  availableEvents = [],
  className,
}: VendorComparisonProps) {
  const { showToast } = useToast()
  const [exporting, setExporting] = useState(false)

  // Remove a vendor from comparison
  const removeVendor = useCallback((_vendorId: string) => {
    // This would be handled by parent component
    // For now, this is a placeholder
  }, [])

  // Comparison metrics
  const metrics: ComparisonMetric[] = [
    {
      id: 'styles',
      label: 'Styles',
      getValue: (v) => v.totalStyles,
      unit: 'styles',
      highlightBest: 'highest',
    },
    {
      id: 'variants',
      label: 'Variants',
      getValue: (v) => v.totalVariants,
      unit: 'variants',
      highlightBest: 'highest',
    },
    {
      id: 'images',
      label: 'Images',
      getValue: (v) => v.totalImages,
      unit: 'images',
      highlightBest: 'highest',
    },
  ]

  // Find best vendor for each metric
  const bestVendors = useMemo(() => {
    const best = new Map<string, VendorStats>()
    if (vendors.length === 0) return best

    metrics.forEach((metric) => {
      let bestVendor: VendorStats | null = null
      let bestValue: number | null = null

      vendors.forEach((vendor) => {
        const value = typeof metric.getValue(vendor) === 'number'
          ? metric.getValue(vendor) as number
          : 0

        if (bestValue === null || value > bestValue) {
          bestValue = value
          bestVendor = vendor
        }
      })

      if (bestVendor) {
        best.set(metric.id, bestVendor)
      }
    })

    return best
  }, [vendors, metrics])

  // Export comparison data as CSV
  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      // Generate CSV content
      const headers = ['Vendor', 'Event', 'Booth', ...metrics.map(m => m.label)]
      const rows = vendors.map((vendor) => [
        vendor.vendorName,
        vendor.eventName,
        vendor.boothNumber || 'N/A',
        ...metrics.map(m => {
          const value = m.getValue(vendor)
          const formatted = m.format
            ? m.format(value)
            : typeof value === 'number' && m.unit
            ? `${value} ${m.unit}`
            : String(value)
          return formatted
        }),
      ])

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n')

      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vendor-comparison-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast({
        title: 'Export successful',
        description: 'Vendor comparison exported as CSV',
        variant: 'success',
        duration: 3000,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export'
      showToast({
        title: 'Export failed',
        description: message,
        variant: 'error',
        duration: 5000,
      })
    } finally {
      setExporting(false)
    }
  }, [vendors, metrics, showToast])

  if (vendors.length === 0) {
    return (
      <div className={cn('text-center py-12 text-muted-foreground', className)}>
        <p className="text-sm">No vendors selected for comparison</p>
        <p className="text-xs mt-1">Select 2-4 vendors to compare</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Vendor Comparison</h3>
          <p className="text-sm text-muted-foreground">
            {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} compared
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Vendor cards comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map((vendor) => (
          <div
            key={vendor.vendorId}
            className={cn(
              'relative p-4 rounded-lg border border-border bg-card',
              'space-y-4'
            )}
          >
            {/* Remove button */}
            <button
              type="button"
              onClick={() => removeVendor(vendor.vendorId)}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-muted transition-colors"
              aria-label="Remove vendor"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Vendor header */}
            <div>
              <h4 className="font-semibold truncate pr-6">{vendor.vendorName}</h4>
              <p className="text-sm text-muted-foreground">{vendor.eventName}</p>
              {vendor.boothNumber && (
                <Badge variant="outline" className="mt-1">
                  {vendor.boothNumber}
                </Badge>
              )}
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              {metrics.map((metric) => {
                const value = metric.getValue(vendor)
                const formatted = metric.format
                  ? metric.format(value)
                  : typeof value === 'number' && metric.unit
                  ? `${value} ${metric.unit}`
                  : String(value)
                const isBest = bestVendors.get(metric.id)?.vendorId === vendor.vendorId

                return (
                  <div
                    key={metric.id}
                    className={cn(
                      'flex justify-between items-center text-sm',
                      isBest && 'font-semibold'
                    )}
                  >
                    <span className="text-muted-foreground">{metric.label}</span>
                    <div className="flex items-center gap-2">
                      <span>{formatted}</span>
                      {isBest && metric.highlightBest === 'highest' && (
                        <Badge variant="outline" className="text-green-600 dark:text-green-400">
                          Best
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Last activity */}
            {(vendor.lastCapture || vendor.lastUpdate) && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {vendor.lastCapture
                    ? `Last capture: ${new Date(vendor.lastCapture).toLocaleDateString()}`
                    : `Last update: ${new Date(vendor.lastUpdate!).toLocaleDateString()}`
                  }
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add vendor button */}
      {availableEvents.length > 0 && (
        <div className="text-center">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor to Compare
          </Button>
        </div>
      )}

      {/* Summary insights */}
      {vendors.length >= 2 && (
        <div className="space-y-2 pt-4 border-t border-border">
          <h4 className="font-medium text-sm">Comparison Insights</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            {metrics.map((metric) => {
              const bestVendor = bestVendors.get(metric.id)
              if (!bestVendor) return null

              return (
                <div key={metric.id}>
                  <ArrowRight className="inline h-3 w-3 mr-1" />
                  <span className="font-medium text-foreground">{bestVendor.vendorName}</span>
                  {' '}has the most {metric.label.toLowerCase()} ({metric.getValue(bestVendor)} {metric.unit})
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Multi-Event Vendor Comparison
 *
 * Compares vendors across multiple events.
 */
export interface MultiEventVendorComparisonProps {
  /** Vendors to compare (may be from different events) */
  vendors: VendorStats[]
  /** Available events to add vendors from */
  availableEvents: Array<{ id: string; name: string }>
  /** Callback to add a vendor to comparison */
  onAddVendor?: (eventId: string) => void
  /** Optional additional className */
  className?: string
}

export function MultiEventVendorComparison({
  vendors,
  availableEvents,
  onAddVendor,
  className,
}: MultiEventVendorComparisonProps) {
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)

  // Group vendors by event
  const vendorsByEvent = useMemo(() => {
    const grouped = new Map<string, VendorStats[]>()
    vendors.forEach((vendor) => {
      const existing = grouped.get(vendor.eventId) || []
      grouped.set(vendor.eventId, [...existing, vendor])
    })
    return grouped
  }, [vendors])

  // Get top vendor from each event for each metric
  const topVendorsByEvent = useMemo(() => {
    const top = new Map<string, Map<string, VendorStats>>()

    vendorsByEvent.forEach((eventVendors, eventId) => {
      const eventTop = new Map<string, VendorStats>()

      metrics.forEach((metric) => {
        let bestVendor: VendorStats | null = null
        let bestValue: number | null = null

        eventVendors.forEach((vendor) => {
          const value = typeof metric.getValue(vendor) === 'number'
            ? metric.getValue(vendor) as number
            : 0

          if (bestValue === null || value > bestValue) {
            bestValue = value
            bestVendor = vendor
          }
        })

        if (bestVendor) {
          eventTop.set(metric.id, bestVendor)
        }
      })

      top.set(eventId, eventTop)
    })

    return top
  }, [vendorsByEvent])

  const metrics: ComparisonMetric[] = [
    { id: 'styles', label: 'Styles', getValue: (v: VendorStats) => v.totalStyles, unit: 'styles', highlightBest: 'highest' },
    { id: 'variants', label: 'Variants', getValue: (v: VendorStats) => v.totalVariants, unit: 'variants', highlightBest: 'highest' },
    { id: 'images', label: 'Images', getValue: (v: VendorStats) => v.totalImages, unit: 'images', highlightBest: 'highest' },
  ]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Event selector for adding vendors */}
      {onAddVendor && availableEvents.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={selectedEvent || ''}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
          >
            <option value="">Select event to add vendor...</option>
            {availableEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={() => selectedEvent && onAddVendor(selectedEvent)}
            disabled={!selectedEvent}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      )}

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 font-medium">Event</th>
              {Array.from(vendorsByEvent.keys()).map((eventId) => (
                <th key={eventId} className="text-center p-2 font-medium">
                  {vendorsByEvent.get(eventId)?.[0]?.eventName || eventId}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr key={metric.id} className="border-b border-border">
                <td className="p-2 text-muted-foreground">{metric.label}</td>
                {Array.from(vendorsByEvent.entries()).map(([eventId, eventVendors]) => {
                  const topVendor = topVendorsByEvent.get(eventId)?.get(metric.id)

                  return (
                    <td key={eventId} className="text-center p-2">
                      <div className="inline-flex items-center gap-1">
                        <span>
                          {eventVendors.length > 0 ? metric.getValue(eventVendors[0]) : '-'}
                          {metric.unit && eventVendors.length > 0 ? ` ${metric.unit}` : ''}
                        </span>
                        {eventVendors.length > 0 && topVendor?.vendorId === eventVendors[0].vendorId && (
                          <Badge variant="outline" className="text-green-600 dark:text-green-400 text-xs">
                            Top
                          </Badge>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Comparing {vendors.length} vendors across {vendorsByEvent.size} event{vendorsByEvent.size !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
