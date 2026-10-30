/**
 * Style Popularity Tracking API
 *
 * Functions for tracking and querying style popularity metrics.
 */

import { supabase } from '@/lib/supabase/client'

export type TimeRange = '1d' | '7d' | '30d' | 'all'
export type ExportType = 'pdf' | 'excel' | 'image'

export interface StyleView {
  id: string
  styleId: string
  userId: string | null
  eventId: string
  viewedAt: string
  sessionId: string | null
}

export interface StyleExport {
  id: string
  styleId: string
  userId: string | null
  eventId: string
  exportType: ExportType
  exportedAt: string
}

export interface PopularStyle {
  styleId: string
  styleName: string | null
  vendorId: string
  vendorName: string | null
  viewCount: number
  exportCount: number
  popularityScore: number
}

/**
 * Track a style view
 */
export async function trackStyleView(
  styleId: string,
  eventId: string,
  sessionId?: string
): Promise<string> {
  const { data, error } = await supabase.rpc('track_style_view', {
    p_style_id: styleId,
    p_event_id: eventId,
    p_session_id: sessionId || null,
  })

  if (error) throw error
  return data as string
}

/**
 * Track a style export
 */
export async function trackStyleExport(
  styleId: string,
  eventId: string,
  exportType: ExportType
): Promise<string> {
  const { data, error } = await supabase.rpc('track_style_export', {
    p_style_id: styleId,
    p_event_id: eventId,
    p_export_type: exportType,
  })

  if (error) throw error
  return data as string
}

/**
 * Get popular styles for an event
 */
export async function getPopularStyles(
  eventId: string,
  timeRange: TimeRange = '7d',
  limit = 20
): Promise<PopularStyle[]> {
  const { data, error } = await supabase.rpc('get_popular_styles', {
    p_event_id: eventId,
    p_time_range: timeRange,
    p_limit: limit,
  })

  if (error) throw error

  return (data || []).map((item: any) => ({
    styleId: item.style_id,
    styleName: item.style_name,
    vendorId: item.vendor_id,
    vendorName: item.vendor_name,
    viewCount: item.view_count,
    exportCount: item.export_count,
    popularityScore: item.popularity_score,
  }))
}

/**
 * Get view history for a style
 */
export async function getStyleViews(
  styleId: string,
  limit = 50
): Promise<StyleView[]> {
  const { data, error } = await supabase
    .from('style_views')
    .select('*')
    .eq('style_id', styleId)
    .order('viewed_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.id,
    styleId: item.style_id,
    userId: item.user_id,
    eventId: item.event_id,
    viewedAt: item.viewed_at,
    sessionId: item.session_id,
  }))
}

/**
 * Get export history for a style
 */
export async function getStyleExports(
  styleId: string,
  limit = 50
): Promise<StyleExport[]> {
  const { data, error } = await supabase
    .from('style_exports')
    .select('*')
    .eq('style_id', styleId)
    .order('exported_at', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.id,
    styleId: item.style_id,
    userId: item.user_id,
    eventId: item.event_id,
    exportType: item.export_type,
    exportedAt: item.exported_at,
  }))
}

/**
 * Get style statistics
 */
export async function getStyleStats(
  styleId: string,
  timeRange?: TimeRange
): Promise<{
  totalViews: number
  totalExports: number
  uniqueViewers: number
}> {
  let query = supabase
    .from('style_views')
    .select('id, user_id', { count: 'exact' })

  if (timeRange && timeRange !== 'all') {
    const timeFilter = getTimeFilter(timeRange)
    query = query.gt('viewed_at', timeFilter)
  }

  const { count: viewCount, error: viewError } = await query.eq('style_id', styleId)

  if (viewError) throw viewError

  // Get unique viewers
  const { data: viewers, error: viewersError } = await supabase
    .from('style_views')
    .select('user_id')
    .eq('style_id', styleId)
    .not('user_id', 'is', null)

  if (viewersError) throw viewersError

  const uniqueViewers = new Set(viewers?.map((v: any) => v.user_id) || []).size

  // Get export count
  let exportQuery = supabase
    .from('style_exports')
    .select('*', { count: 'exact' })

  if (timeRange && timeRange !== 'all') {
    const timeFilter = getTimeFilter(timeRange)
    exportQuery = exportQuery.gt('exported_at', timeFilter)
  }

  const { count: exportCount, error: exportError } = await exportQuery.eq('style_id', styleId)

  if (exportError) throw exportError

  return {
    totalViews: viewCount || 0,
    totalExports: exportCount || 0,
    uniqueViewers,
  }
}

/**
 * Helper function to get time filter for a time range
 */
function getTimeFilter(timeRange: TimeRange): string {
  const now = new Date()
  switch (timeRange) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    default:
      return new Date(0).toISOString()
  }
}

/**
 * Subscribe to style view changes
 */
export function subscribeToStyleViews(
  styleId: string,
  callback: (views: StyleView[]) => void
) {
  return supabase
    .channel(`style_views:${styleId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'style_views',
        filter: `style_id=eq.${styleId}`,
      },
      async () => {
        const views = await getStyleViews(styleId, 100)
        callback(views)
      }
    )
    .subscribe()
}
