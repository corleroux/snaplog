/**
 * Team Productivity API Functions
 *
 * Functions for fetching team productivity metrics.
 */

import { supabase } from '@/lib/supabase/client'

export type ProductivityTimeRange = 'today' | 'week' | 'month' | 'all'

export interface UserProductivity {
  userId: string
  userEmail: string
  userName?: string
  vendorCaptures: number
  styleCaptures: number
  totalCaptures: number
  completionRate: number
  lastCaptureAt?: string
}

/**
 * Get date range filter for time range
 */
function getDateRangeFilter(timeRange: ProductivityTimeRange): { start: Date | null } {
  const start = new Date()

  switch (timeRange) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'week':
      start.setDate(start.getDate() - 7)
      break
    case 'month':
      start.setDate(start.getDate() - 30)
      break
    case 'all':
      return { start: null }
  }

  return { start }
}

/**
 * Get team productivity metrics for an event
 */
export async function getTeamProductivity(
  eventId: string,
  timeRange: ProductivityTimeRange = 'week'
): Promise<UserProductivity[]> {
  const { start } = getDateRangeFilter(timeRange)

  // Get all event members
  const { data: members, error: membersError } = await supabase
    .from('event_members')
    .select('user_id')
    .eq('event_id', eventId)

  if (membersError) throw membersError

  const userIds = members?.map((m: any) => m.user_id) || []

  if (userIds.length === 0) {
    return []
  }

  // Get user profiles
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)

  if (profilesError) throw profilesError

  // Get vendor captures by user
  const { data: vendors, error: vendorsError } = await supabase
    .from('vendors')
    .select('created_by, created_at')
    .eq('event_id', eventId)

  if (vendorsError) throw vendorsError

  // Get style captures by user (via vendors)
  const { data: vendorsForStyles, error: vendorsForStylesError } = await supabase
    .from('vendors')
    .select('id')
    .eq('event_id', eventId)

  if (vendorsForStylesError) throw vendorsForStylesError

  const vendorIds = vendorsForStyles?.map((v: any) => v.id) || []

  let styleCapturesByUser: Record<string, number> = {}
  if (vendorIds.length > 0) {
    const { data: styles, error: stylesError } = await supabase
      .from('fabric_styles')
      .select('created_by')
      .in('vendor_id', vendorIds)

    if (!stylesError && styles) {
      styles.forEach((style: any) => {
        styleCapturesByUser[style.created_by] = (styleCapturesByUser[style.created_by] || 0) + 1
      })
    }
  }

  // Apply time range filter to captures
  const filteredVendors = vendors?.filter((v: any) => {
    if (!start) return true
    return new Date(v.created_at) >= start
  }) || []

  // Count vendor captures by user
  const vendorCapturesByUser: Record<string, number> = {}
  const lastCaptureByUser: Record<string, string> = {}
  filteredVendors.forEach((v: any) => {
    vendorCapturesByUser[v.created_by] = (vendorCapturesByUser[v.created_by] || 0) + 1
    if (!lastCaptureByUser[v.created_by] || new Date(v.created_at) > new Date(lastCaptureByUser[v.created_by])) {
      lastCaptureByUser[v.created_by] = v.created_at
    }
  })

  // Calculate productivity for each user
  const productivity: UserProductivity[] = profiles?.map((profile: any) => {
    const userId = profile.id
    const vendorCaptures = vendorCapturesByUser[userId] || 0
    const styleCaptures = styleCapturesByUser[userId] || 0
    const totalCaptures = vendorCaptures + styleCaptures

    // Calculate completion rate (this is a simplified metric)
    // In a real implementation, you might track assignments or expected targets
    const completionRate = totalCaptures > 0 ? Math.min(100, Math.round((totalCaptures / 10) * 100)) : 0

    return {
      userId,
      userEmail: profile.email,
      userName: profile.full_name,
      vendorCaptures,
      styleCaptures,
      totalCaptures,
      completionRate,
      lastCaptureAt: lastCaptureByUser[userId]
    }
  }) || []

  // Sort by total captures
  productivity.sort((a, b) => b.totalCaptures - a.totalCaptures)

  return productivity
}

/**
 * Get leaderboard for an event
 */
export async function getLeaderboard(
  eventId: string,
  timeRange: ProductivityTimeRange = 'week',
  limit = 10
): Promise<UserProductivity[]> {
  const productivity = await getTeamProductivity(eventId, timeRange)
  return productivity.slice(0, limit)
}

/**
 * Get user productivity stats
 */
export async function getUserProductivity(
  eventId: string,
  userId: string,
  timeRange: ProductivityTimeRange = 'week'
): Promise<UserProductivity | null> {
  const productivity = await getTeamProductivity(eventId, timeRange)
  return productivity.find(p => p.userId === userId) || null
}
