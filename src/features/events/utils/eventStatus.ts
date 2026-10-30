/**
 * Event status utilities
 *
 * Provides functions to compute event status dynamically based on dates.
 */

export type EventStatus = 'upcoming' | 'active' | 'archived'

export interface EventWithDates {
  starts_on?: string | null
  ends_on?: string | null
}

/**
 * Compute event status dynamically based on current date and event dates
 *
 * Rules:
 * - No dates set → upcoming
 * - Start date in future → upcoming
 * - Start date in past AND end date in future → active
 * - End date in past (or both dates in past) → archived
 */
export function computeEventStatus(event: EventWithDates): EventStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset to start of day for comparison

  const startsOn = event.starts_on ? new Date(event.starts_on) : null
  const endsOn = event.ends_on ? new Date(event.ends_on) : null

  // Normalize dates to start of day for comparison
  if (startsOn) startsOn.setHours(0, 0, 0, 0)
  if (endsOn) endsOn.setHours(0, 0, 0, 0)

  // No dates set → upcoming
  if (!startsOn && !endsOn) {
    return 'upcoming'
  }

  // Only start date set
  if (startsOn && !endsOn) {
    return startsOn > today ? 'upcoming' : 'active'
  }

  // Only end date set (unusual but handle it)
  if (!startsOn && endsOn) {
    return endsOn > today ? 'active' : 'archived'
  }

  // Both dates set
  if (startsOn && endsOn) {
    if (endsOn < today) {
      return 'archived' // Event has ended
    }
    if (startsOn > today) {
      return 'upcoming' // Event hasn't started yet
    }
    return 'active' // Event is ongoing (started but not ended)
  }

  return 'upcoming' // Default fallback
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    upcoming: 'Upcoming',
    active: 'Active',
    archived: 'Archived',
  }
  return labels[status]
}

/**
 * Get badge variant for EntityCard
 */
export function getStatusBadgeVariant(status: EventStatus): 'upcoming' | 'active' | 'archived' {
  return status
}
