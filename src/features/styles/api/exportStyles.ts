/**
 * Style CSV Export
 *
 * Exports all styles for an event (across all vendors) as a CSV file.
 * Includes vendor name by resolving vendorId against the vendor list.
 */

import { styleRepository } from './styleRepository'
import { vendorRepository } from '@/features/vendors'
import { objectsToCsv, downloadCsv } from '@/lib/export/csvExport'
import type { StyleRecord } from '@/types/style'
import type { VendorRecord } from '@/types/vendor'

interface StyleExportRow {
  item_code: string
  name: string
  composition: string
  category: string
  width_cm: string
  weight_gsm: string
  season: string
  vendor_name: string
}

const STYLE_COLUMNS: { key: keyof StyleExportRow; label: string }[] = [
  { key: 'item_code', label: 'Item Code' },
  { key: 'name', label: 'Name' },
  { key: 'composition', label: 'Composition' },
  { key: 'category', label: 'Category' },
  { key: 'width_cm', label: 'Width' },
  { key: 'weight_gsm', label: 'Weight' },
  { key: 'season', label: 'Season' },
  { key: 'vendor_name', label: 'Vendor' },
]

/**
 * Convert StyleRecords to export rows, resolving vendor names.
 */
function styleRecordsToExportRows(
  styles: StyleRecord[],
  vendorMap: Map<string, string>
): StyleExportRow[] {
  return styles.map(style => ({
    item_code: style.sku || '',
    name: style.styleName || '',
    composition: style.composition || '',
    category: style.category || '',
    width_cm: style.width || '',
    weight_gsm: style.weight || '',
    season: style.season || '',
    vendor_name: vendorMap.get(style.vendorId) || '',
  }))
}

/**
 * Export all styles for an event as a CSV download.
 *
 * Fetches styles across all vendors for the event and resolves
 * vendor names from the vendor records.
 *
 * @param eventId - The event ID to export styles for
 * @param filename - Optional filename override (defaults to event-timestamped name)
 */
export async function exportStylesForEvent(
  eventId: string,
  filename?: string
): Promise<void> {
  const [styles, vendors] = await Promise.all([
    styleRepository.getStylesByEvent(eventId),
    vendorRepository.getByEvent(eventId),
  ])

  // Build vendor ID -> company name map
  const vendorMap = new Map<string, string>()
  for (const v of vendors as VendorRecord[]) {
    vendorMap.set(v.id, v.companyName)
  }

  const rows = styleRecordsToExportRows(styles, vendorMap)
  const csv = objectsToCsv(rows, STYLE_COLUMNS)

  const timestamp = new Date().toISOString().slice(0, 10)
  const downloadFilename = filename || `styles-export-${timestamp}.csv`
  downloadCsv(csv, downloadFilename)
}

/**
 * Export styles for a single vendor as a CSV download.
 *
 * Fetches styles for a specific vendor within an event context.
 *
 * @param vendorId - The vendor ID to export styles for
 * @param vendorName - The vendor name for the filename
 * @param filename - Optional filename override
 */
export async function exportStylesForVendor(
  vendorId: string,
  vendorName: string,
  filename?: string
): Promise<void> {
  const styles = await styleRepository.getStylesByVendor(vendorId)

  const rows = styleRecordsToExportRows(
    styles,
    new Map([[vendorId, vendorName]])
  )
  const csv = objectsToCsv(rows, STYLE_COLUMNS)

  const safeName = vendorName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const timestamp = new Date().toISOString().slice(0, 10)
  const downloadFilename = filename || `${safeName}-styles-${timestamp}.csv`
  downloadCsv(csv, downloadFilename)
}
