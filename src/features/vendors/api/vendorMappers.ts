/**
 * Vendor Mappers - Case mapping constants and row↔record conversion functions
 *
 * Provides mapping between app-facing VendorRecord types and
 * persistence-facing vendor row types.
 */

import type { Vendor, VendorImage } from '@/lib/supabase/types'
import type { VendorRecord, VendorImageRecord, VendorExtractionMeta } from '@/types/vendor'
import { toCamelCase, toSnakeCase } from '@/utils/caseMapping'
import { safeParseJsonb, brandNamesSchema, vendorWarningsSchema } from '@/lib/validation/jsonbSchemas'
import { storagePathToPublicUrl, isSignedUrl } from '@/lib/upload/storageUrls'

/**
 * App-facing Vendor domain types for repository operations
 */

export interface VendorCreateInput {
  eventId: string
  companyName: string
  boothNumber?: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  countryOfOrigin?: string
  brandNames?: string
  notes?: string
  images: VendorImageRecord[]
  sourceInfoImageId?: string
  extractionMeta?: VendorExtractionMeta
}

export interface VendorUpdateInput {
  companyName?: string
  boothNumber?: string
  contactName?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  countryOfOrigin?: string
  brandNames?: string
  notes?: string
  images?: VendorImageRecord[]
}

/**
 * Mapper functions: App-facing ↔ Persistence-facing
 */

/**
 * DB → App field-name overrides (fields that differ beyond case conversion).
 * Keys are DB column names, values are app-facing field names.
 */
const VENDOR_DB_TO_APP_KEYS: Record<string, string> = {
  contact_person: 'contactName',
  website_url: 'website',
}

/**
 * App → DB field-name overrides (fields that differ beyond case conversion).
 * Keys are app-facing names, values are DB column names.
 */
export const VENDOR_APP_TO_DB_KEYS: Record<string, string> = {
  contactName: 'contact_person',
  website: 'website_url',
}

/**
 * Convert persistence-facing vendors row to app-facing VendorRecord.
 *
 * Uses toCamelCase for bulk conversion, then applies:
 * - field-name overrides (contact_person→contactName, website_url→website)
 * - value transforms (brand_names array→comma string, null→empty string defaults)
 */
export function vendorRowToVendorRecord(row: Vendor, images: VendorImage[] = [], styleCount?: number): VendorRecord {
  const mapped = toCamelCase(row) as Record<string, unknown>

  // Apply field-name overrides: rename DB-specific keys to app-facing names
  for (const [dbKey, appKey] of Object.entries(VENDOR_DB_TO_APP_KEYS)) {
    if (dbKey in mapped) {
      mapped[appKey] = mapped[dbKey]
      delete mapped[dbKey]
    }
  }

  return {
    id: String(mapped.id),
    eventId: String(mapped.eventId),
    companyName: String(mapped.companyName ?? ''),
    boothNumber: String(mapped.boothNumber ?? ''),
    contactName: String(mapped.contactName ?? ''),
    email: String(mapped.email ?? ''),
    phone: String(mapped.phone ?? ''),
    website: String(mapped.website ?? ''),
    address: String(mapped.address ?? ''),
    countryOfOrigin: String(mapped.countryOfOrigin ?? ''),
    brandNames: (() => {
      const parsed = safeParseJsonb(brandNamesSchema, row.brand_names, 'brand_names')
      return parsed ? parsed.join(', ') : ''
    })(),
    notes: String(mapped.notes ?? ''),
    status: String(mapped.status ?? 'active'),
    images: (images ?? []).map(vendorImageToVendorImageRecord),
    sourceInfoImageId: (typeof mapped.sourceInfoImageId === 'string' && mapped.sourceInfoImageId) || undefined,
    createdAt: String(mapped.createdAt),
    extractionMeta: extractExtractionMetaFromVendorRow(row),
    extractionConfidence: row.extraction_confidence ?? null,
    version: row.version,
    styleCount,
    sortOrder: (row as any).sort_order ?? 0,
  }
}

/**
 * Convert persistence-facing vendor_images row to app-facing VendorImageRecord
 */
export function vendorImageToVendorImageRecord(row: VendorImage): VendorImageRecord {
  // Use public_url if it's a valid (non-signed) URL, otherwise generate from storage_path
  const uri = row.public_url && !isSignedUrl(row.public_url)
    ? row.public_url
    : storagePathToPublicUrl(row.storage_path)

  return {
    id: row.id,
    uri,
    storagePath: row.storage_path,
    caption: row.caption || undefined,
  }
}

/**
 * Extract extraction metadata from vendor row (if present)
 */
function extractExtractionMetaFromVendorRow(row: Vendor): VendorExtractionMeta | undefined {
  // Cast is safe: row comes from typed Supabase query, these fields exist on the table
  const rowAny = row as Record<string, unknown>
  const extractedAt = typeof rowAny.extracted_at === 'string' ? rowAny.extracted_at : undefined
  const parsed = safeParseJsonb(vendorWarningsSchema, rowAny.extraction_warnings, 'extraction_warnings')

  if (!extractedAt && !parsed) {
    return undefined
  }

  return {
    extractedAt: extractedAt || new Date().toISOString(),
    warnings: parsed || [],
  }
}

/**
 * Convert app-facing VendorCreateInput to persistence-facing vendors insert.
 *
 * Uses toSnakeCase for bulk conversion, then applies:
 * - field-name overrides (contactName→contact_person, website→website_url)
 * - value transforms (brandNames comma-string→array, null defaults)
 * - server-managed fields (source, status, created_by, etc.)
 */
export function vendorCreateInputToVendorRow(
  input: VendorCreateInput,
  userId: string
): Omit<Vendor, 'id' | 'created_at' | 'updated_at'> {
  // Rename fields that differ beyond case conversion before bulk conversion
  const renamed: Record<string, unknown> = { ...input }
  for (const [appKey, dbKey] of Object.entries(VENDOR_APP_TO_DB_KEYS)) {
    if (appKey in renamed) {
      renamed[dbKey] = renamed[appKey]
      delete renamed[appKey]
    }
  }

  // Bulk-convert to snake_case (renamed fields will get correct snake form)
  const snakeInput = toSnakeCase(renamed) as Record<string, unknown>

  return {
    event_id: snakeInput.event_id as string,
    company_name: snakeInput.company_name as string,
    booth_number: (snakeInput.booth_number as string) || null,
    contact_person: (snakeInput.contact_person as string) || null,
    email: (snakeInput.email as string) || null,
    phone: (snakeInput.phone as string) || null,
    whatsapp: null,
    website_url: (snakeInput.website_url as string) || null,
    address: (snakeInput.address as string) || null,
    country_of_origin: (snakeInput.country_of_origin as string) || null,
    brand_names: input.brandNames ? input.brandNames.split(',').map(s => s.trim()).filter(Boolean) : [],
    notes: (snakeInput.notes as string) || null,
    source: input.extractionMeta ? 'ai' : 'manual',
    status: 'active',
    created_by: userId,
    updated_by: null,
    // New lifecycle fields
    source_info_image_id: input.sourceInfoImageId || null,
    extracted_at: input.extractionMeta?.extractedAt || null,
    extraction_status: input.extractionMeta ? 'complete' : null,
    extraction_warnings: input.extractionMeta?.warnings || [],
    extraction_confidence: null,
    deleted_at: null,
    version: 1,
  }
}
