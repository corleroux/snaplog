/**
 * Vendor CSV Export
 *
 * Exports all vendors for an event as a CSV file.
 */

import { vendorRepository } from './vendorRepository'
import { objectsToCsv, downloadCsv } from '@/lib/export/csvExport'
import type { VendorRecord } from '@/types/vendor'

interface VendorExportRow {
  company_name: string
  booth_number: string
  contact_person: string
  email: string
  phone: string
  country_of_origin: string
}

const VENDOR_COLUMNS: { key: keyof VendorExportRow; label: string }[] = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'booth_number', label: 'Booth Number' },
  { key: 'contact_person', label: 'Contact Person' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'country_of_origin', label: 'Country of Origin' },
]

/**
 * Convert VendorRecords to export rows.
 */
function vendorRecordsToExportRows(vendors: VendorRecord[]): VendorExportRow[] {
  return vendors.map(vendor => ({
    company_name: vendor.companyName || '',
    booth_number: vendor.boothNumber || '',
    contact_person: vendor.contactName || '',
    email: vendor.email || '',
    phone: vendor.phone || '',
    country_of_origin: vendor.countryOfOrigin || '',
  }))
}

/**
 * Export all vendors for an event as a CSV download.
 *
 * @param eventId - The event ID to export vendors for
 * @param eventName - Optional event name for the filename
 * @param filename - Optional filename override
 */
export async function exportVendorsForEvent(
  eventId: string,
  eventName?: string,
  filename?: string
): Promise<void> {
  const vendors = await vendorRepository.getByEvent(eventId)
  const rows = vendorRecordsToExportRows(vendors)
  const csv = objectsToCsv(rows, VENDOR_COLUMNS)

  const timestamp = new Date().toISOString().slice(0, 10)
  const safeName = eventName
    ? eventName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
    : eventId.slice(0, 8)
  const downloadFilename = filename || `${safeName}-vendors-${timestamp}.csv`
  downloadCsv(csv, downloadFilename)
}
