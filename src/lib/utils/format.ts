/**
 * Date formatting utilities
 */

/**
 * Format a date string or timestamp to a readable date
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date string or timestamp to a readable date and time
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
