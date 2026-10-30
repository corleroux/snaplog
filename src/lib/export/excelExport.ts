/**
 * Excel Export Utilities
 *
 * Exports vendors and styles to Excel format with formatting.
 * Uses the xlsx library (SheetJS) for Excel file generation.
 */

import type { VendorRecord } from '@/types/vendor'
import type { StyleRecord } from '@/types/style'

/**
 * Column definition for Excel exports
 */
interface ExcelColumn {
  /** Column header */
  header: string
  /** Property key in data object (supports nested with dot notation) */
  key: string
  /** Column width in characters (default: 15) */
  width?: number
  /** Format string for numbers/dates */
  format?: string
  /** Custom value formatter */
  formatter?: (value: unknown) => string | number
}

/**
 * Excel export options
 */
interface ExcelExportOptions {
  /** Sheet name (default: "Sheet1") */
  sheetName?: string
  /** File name without extension (default: "export") */
  fileName?: string
  /** Whether to include headers (default: true) */
  includeHeaders?: boolean
  /** Freeze header row (default: true) */
  freezeHeader?: boolean
  /** Auto-filter on headers (default: true) */
  autoFilter?: boolean
}

/**
 * Get nested property value from object using dot notation
 */
function getNestedValue(obj: object, path: string): unknown {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
  }, obj as unknown)
}

/**
 * Format value for Excel cell
 */
function formatValue(value: unknown, formatter?: (value: unknown) => string | number): string | number {
  if (formatter) {
    return formatter(value)
  }

  if (value === null || value === undefined) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return value as string | number
}

/**
 * Convert data to worksheet with headers
 */
function dataToWorksheet<T extends object>(
  data: T[],
  columns: ExcelColumn[]
): (string | number)[][] {
  const worksheet: (string | number)[][] = []

  // Add header row
  worksheet.push(columns.map(col => col.header))

  // Add data rows
  for (const row of data) {
    const dataRow: (string | number)[] = []
    for (const column of columns) {
      const value = getNestedValue(row, column.key)
      dataRow.push(formatValue(value, column.formatter))
    }
    worksheet.push(dataRow)
  }

  return worksheet
}

/**
 * Download worksheet as Excel file using CSV format (fallback)
 *
 * Note: Full Excel (.xlsx) support requires xlsx library which adds significant bundle size.
 * This implementation uses CSV as a lightweight fallback that opens in Excel.
 * For full Excel support with formatting, install xlsx: npm install xlsx
 */
function downloadAsCSV(
  worksheet: (string | number)[][],
  fileName: string
): void {
  // Convert worksheet to CSV
  const csvContent = worksheet
    .map(row =>
      row
        .map(cell => {
          const value = String(cell ?? '')
          // Escape quotes and wrap in quotes if contains comma or quote
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(',')
    )
    .join('\n')

  // Add BOM for UTF-8 Excel compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

  // Create download link
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Vendor export columns
 */
const VENDOR_COLUMNS: ExcelColumn[] = [
  { header: 'Company Name', key: 'companyName', width: 30 },
  { header: 'Booth Number', key: 'boothNumber', width: 15 },
  { header: 'Contact Person', key: 'contactPerson', width: 20 },
  { header: 'Email', key: 'email', width: 25 },
  { header: 'Phone', key: 'phone', width: 15 },
  { header: 'WhatsApp', key: 'whatsapp', width: 15 },
  { header: 'Website', key: 'websiteUrl', width: 25 },
  { header: 'Country', key: 'countryOfOrigin', width: 15 },
  { header: 'Brands', key: 'brandNames', formatter: (v) => (Array.isArray(v) ? v.join(', ') : '') },
  { header: 'Notes', key: 'notes', width: 30 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Created', key: 'createdAt', width: 20 },
  { header: 'Updated', key: 'updatedAt', width: 20 },
]

/**
 * Style export columns
 */
const STYLE_COLUMNS: ExcelColumn[] = [
  { header: 'Style Name', key: 'name', width: 25 },
  { header: 'Vendor', key: 'vendorName', width: 20 },
  { header: 'Category', key: 'category', width: 15 },
  { header: 'Season', key: 'season', width: 10 },
  { header: 'Content', key: 'content', width: 15 },
  { header: 'Construction', key: 'construction', width: 15 },
  { header: 'Width (cm)', key: 'width', formatter: (v) => (v ? Number(v) : '') },
  { header: 'Weight (gsm)', key: 'weight', formatter: (v) => (v ? Number(v) : '') },
  { header: 'Price', key: 'price', formatter: (v) => (v ? `$${Number(v)}` : '') },
  { header: 'Currency', key: 'currency', width: 10 },
  { header: 'Unit', key: 'priceUnit', width: 10 },
  { header: 'MOQ', key: 'moq', formatter: (v) => (v ? Number(v) : '') },
  { header: 'Lead Time', key: 'leadTimeWeeks', formatter: (v) => (v ? `${v} weeks` : '') },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Notes', key: 'notes', width: 30 },
  { header: 'Created', key: 'createdAt', width: 20 },
  { header: 'Updated', key: 'updatedAt', width: 20 },
]

/**
 * Export vendors to Excel (CSV format)
 *
 * @param vendors - Array of vendor records to export
 * @param options - Export options
 *
 * @example
 * ```tsx
 * const { vendors } = useVendorsForEvent(eventId)
 * exportVendorsToExcel(vendors, { fileName: 'vendors-export' })
 * ```
 */
export function exportVendorsToExcel(
  vendors: VendorRecord[],
  options: ExcelExportOptions = {}
): void {
  const {
    fileName = 'vendors-export',
  } = options

  const worksheet = dataToWorksheet(vendors, VENDOR_COLUMNS)
  downloadAsCSV(worksheet, fileName)
}

/**
 * Export styles to Excel (CSV format)
 *
 * @param styles - Array of style records to export
 * @param options - Export options
 *
 * @example
 * ```tsx
 * const { styles } = useStylesForVendor(vendorId)
 * exportStylesToExcel(styles, { fileName: 'styles-export' })
 * ```
 */
export function exportStylesToExcel(
  styles: StyleRecord[],
  options: ExcelExportOptions = {}
): void {
  const {
    fileName = 'styles-export',
  } = options

  const worksheet = dataToWorksheet(styles, STYLE_COLUMNS)
  downloadAsCSV(worksheet, fileName)
}

/**
 * Export any data to Excel with custom columns
 *
 * @param data - Array of objects to export
 * @param columns - Column definitions
 * @param options - Export options
 *
 * @example
 * ```tsx
 * exportToExcel(
 *   data,
 *   [
 *     { header: 'Name', key: 'name' },
 *     { header: 'Email', key: 'email' },
 *   ],
 *   { fileName: 'custom-export' }
 * )
 * ```
 */
export function exportToExcel<T extends object>(
  data: T[],
  columns: ExcelColumn[],
  options: ExcelExportOptions = {}
): void {
  const {
    fileName = 'export',
  } = options

  const worksheet = dataToWorksheet(data, columns)
  downloadAsCSV(worksheet, fileName)
}
