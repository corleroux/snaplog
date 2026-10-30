/**
 * CSV Export Utility
 *
 * Generic functions for converting data objects to CSV format
 * and triggering browser downloads.
 */

/**
 * Convert an array of objects to CSV string.
 *
 * Handles escaping of commas, double quotes, and newlines per RFC 4180.
 * Null and undefined values become empty strings.
 * Object values are JSON-serialized.
 *
 * @param data - Array of data objects
 * @param columns - Column definitions with key and label
 * @returns CSV string with header row
 */
export function objectsToCsv<T extends object>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  const header = columns.map(c => c.label).join(',')
  const rows = data.map(item =>
    columns.map(col => {
      const value = item[col.key]
      if (value === null || value === undefined) return ''
      if (typeof value === 'object') return JSON.stringify(value)
      const str = String(value)
      // Escape CSV: wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

/**
 * Trigger a CSV file download in the browser.
 *
 * Creates a Blob URL, initiates download via a temporary anchor element,
 * and revokes the URL after triggering the download.
 *
 * @param csvContent - The CSV string content
 * @param filename - The filename for the download (should end in .csv)
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
