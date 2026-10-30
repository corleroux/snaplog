/**
 * Trend Analysis API Functions
 *
 * Functions for fetching trend data over time.
 */

import { supabase } from '@/lib/supabase/client'

export type TrendTimeRange = '7d' | '30d' | '90d' | '1y'

export interface TrendDataPoint {
  date: string
  value: number
  label?: string
}

export interface TrendMetric {
  id: string
  name: string
  data: TrendDataPoint[]
  color: string
  unit: string
}

/**
 * Get date range for a time range
 */
function getDateRange(timeRange: TrendTimeRange): { start: Date; end: Date } {
  const end = new Date()
  const start = new Date()

  switch (timeRange) {
    case '7d':
      start.setDate(end.getDate() - 7)
      break
    case '30d':
      start.setDate(end.getDate() - 30)
      break
    case '90d':
      start.setDate(end.getDate() - 90)
      break
    case '1y':
      start.setFullYear(end.getFullYear() - 1)
      break
  }

  return { start, end }
}

/**
 * Get vendor capture trend over time
 */
export async function getVendorCaptureTrend(
  eventId: string,
  timeRange: TrendTimeRange
): Promise<TrendDataPoint[]> {
  const { start, end } = getDateRange(timeRange)

  const { data, error } = await supabase
    .from('vendors')
    .select('created_at')
    .eq('event_id', eventId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw error

  // Group by date
  const grouped = new Map<string, number>()
  const { start: rangeStart, end: rangeEnd } = getDateRange(timeRange)
  const current = new Date(rangeStart)

  while (current <= rangeEnd) {
    const dateKey = current.toISOString().split('T')[0]
    grouped.set(dateKey, 0)
    current.setDate(current.getDate() + 1)
  }

  data?.forEach((vendor: any) => {
    const dateKey = new Date(vendor.created_at).toISOString().split('T')[0]
    grouped.set(dateKey, (grouped.get(dateKey) || 0) + 1)
  })

  return Array.from(grouped.entries()).map(([date, value]) => ({
    date,
    value,
  }))
}

/**
 * Get style capture trend over time
 */
export async function getStyleCaptureTrend(
  eventId: string,
  timeRange: TrendTimeRange
): Promise<TrendDataPoint[]> {
  const { start, end } = getDateRange(timeRange)

  // First get vendors for the event
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('id')
    .eq('event_id', eventId)

  if (vendorsError) throw vendorsError

  const vendorIds = vendors?.map((v: any) => v.id) || []

  if (vendorIds.length === 0) {
    return []
  }

  // Then get styles for those vendors
  const { data, error } = await supabase
    .from('styles')
    .select('created_at')
    .in('vendor_id', vendorIds)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  if (error) throw error

  // Group by date
  const grouped = new Map<string, number>()
  const { start: rangeStart, end: rangeEnd } = getDateRange(timeRange)
  const current = new Date(rangeStart)

  while (current <= rangeEnd) {
    const dateKey = current.toISOString().split('T')[0]
    grouped.set(dateKey, 0)
    current.setDate(current.getDate() + 1)
  }

  data?.forEach((style: any) => {
    const dateKey = style.created_at.split('T')[0]
    grouped.set(dateKey, (grouped.get(dateKey) || 0) + 1)
  })

  return Array.from(grouped.entries()).map(([date, value]) => ({
    date,
    value,
  }))
}

/**
 * Get style view trend over time
 */
export async function getStyleViewTrend(
  eventId: string,
  timeRange: TrendTimeRange
): Promise<TrendDataPoint[]> {
  const { start, end } = getDateRange(timeRange)

  const { data, error } = await supabase
    .from('style_views')
    .select('viewed_at')
    .eq('event_id', eventId)
    .gte('viewed_at', start.toISOString())
    .lte('viewed_at', end.toISOString())
    .order('viewed_at', { ascending: true })

  if (error) throw error

  // Group by date
  const grouped = new Map<string, number>()
  const { start: rangeStart, end: rangeEnd } = getDateRange(timeRange)
  const current = new Date(rangeStart)

  while (current <= rangeEnd) {
    const dateKey = current.toISOString().split('T')[0]
    grouped.set(dateKey, 0)
    current.setDate(current.getDate() + 1)
  }

  data?.forEach((view: any) => {
    const dateKey = new Date(view.viewed_at).toISOString().split('T')[0]
    grouped.set(dateKey, (grouped.get(dateKey) || 0) + 1)
  })

  return Array.from(grouped.entries()).map(([date, value]) => ({
    date,
    value,
  }))
}

/**
 * Get all trend metrics for an event
 */
export async function getEventTrends(
  eventId: string,
  timeRange: TrendTimeRange
): Promise<TrendMetric[]> {
  const [captures, styles, views] = await Promise.all([
    getVendorCaptureTrend(eventId, timeRange),
    getStyleCaptureTrend(eventId, timeRange),
    getStyleViewTrend(eventId, timeRange),
  ])

  return [
    {
      id: 'captures',
      name: 'Vendors Captured',
      data: captures,
      color: '#22c55e',
      unit: 'vendors',
    },
    {
      id: 'styles',
      name: 'Styles Captured',
      data: styles,
      color: '#3b82f6',
      unit: 'styles',
    },
    {
      id: 'views',
      name: 'Style Views',
      data: views,
      color: '#f59e0b',
      unit: 'views',
    },
  ]
}
