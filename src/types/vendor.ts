/**
 * Vendor Types
 *
 * Core domain types for vendor entities.
 * These are the business entities, not UI state.
 */

/**
 * Vendor entity as stored in the database
 */
export interface Vendor {
  id: string
  event_id: string
  company_name: string
  booth_number?: string | null
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  website_url?: string | null
  address?: string | null
  country_of_origin?: string | null
  brand_names?: string[] | null
  notes?: string | null
  created_at: string
  updated_at: string
}

/**
 * Vendor image for display/gallery
 */
export interface VendorImage {
  id: string
  vendor_id: string
  storage_path: string
  public_url: string
  caption?: string | null
  is_thumbnail: boolean
  sort_order: number
  created_at: string
}

/**
 * Confidence levels for extracted fields
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * Field-specific confidence mapping
 */
export interface FieldConfidence {
  companyName?: ConfidenceLevel
  boothNumber?: ConfidenceLevel
  contactPerson?: ConfidenceLevel
  email?: ConfidenceLevel
  phone?: ConfidenceLevel
  website?: ConfidenceLevel
  address?: ConfidenceLevel
}

/**
 * Result of vendor extraction from an Info image.
 */
export type VendorExtractionResult = {
  /** Extraction status */
  status: 'success' | 'failed'

  /** When extraction was performed */
  extractedAt: string

  /** ID of the source image used for extraction */
  sourceImageId: string

  /** Per-field confidence scores */
  confidence: {
    companyName?: ConfidenceLevel
    boothNumber?: ConfidenceLevel
    contactPerson?: ConfidenceLevel
    email?: ConfidenceLevel
    phone?: ConfidenceLevel
    website?: ConfidenceLevel
    address?: ConfidenceLevel
  }

  /** Extracted field values */
  fields: {
    companyName: string
    boothNumber: string
    contactPerson: string
    email: string
    phone: string
    website: string
    address: string
    countryOfOrigin: string
    brandNames: string
    notes: string
  }

  /** Any warnings or issues during extraction */
  warnings: string[]
}

// ─── UI-Facing Types (merged from vendorRecord.ts) ───────────────────

/**
 * Vendor image record
 */
export interface VendorImageRecord {
  id: string
  uri: string
  storagePath?: string
  caption?: string
}

/**
 * Extraction metadata from the AI processing
 */
export interface VendorExtractionMeta {
  extractedAt: string
  warnings: string[]
}

/**
 * Complete vendor record for the mock store
 *
 * This represents a vendor as stored in the mock store after
 * successful creation. It's designed to align with the extraction
 * result from the capture flow.
 */
export interface VendorRecord {
  /** Unique vendor identifier */
  id: string

  /** Event this vendor belongs to */
  eventId: string

  /** Company name (required) */
  companyName: string

  /** Booth number at the event */
  boothNumber: string

  /** Primary contact person */
  contactName: string

  /** Email address */
  email: string

  /** Phone number */
  phone: string

  /** Website URL */
  website: string

  /** Physical address */
  address: string

  /** Country of origin */
  countryOfOrigin: string

  /** Brand names associated with vendor */
  brandNames: string

  /** Additional notes */
  notes: string

  /** Vendor status (active, archived) */
  status?: string

  /** All images associated with this vendor */
  images: VendorImageRecord[]

  /** ID of the original Info image used for extraction */
  sourceInfoImageId?: string

  /** When the vendor was created */
  createdAt: string

  /** Extraction metadata if AI was used */
  extractionMeta?: VendorExtractionMeta

  /** AI extraction confidence score (0-1), null for manual entry */
  extractionConfidence?: number | null

  /** Optimistic concurrency version counter */
  version: number

  /** Number of styles captured for this vendor */
  styleCount?: number

  /** Manual sort order for drag-and-drop reordering (lower = earlier) */
  sortOrder?: number
}

/**
 * Form for creating a vendor record from extraction result
 */
export interface VendorRecordCreateInput {
  eventId: string
  companyName: string
  boothNumber: string
  contactName: string
  email: string
  phone: string
  website: string
  address: string
  countryOfOrigin: string
  brandNames: string
  notes: string
  images: VendorImageRecord[]
  sourceInfoImageId?: string
  extractionMeta?: VendorExtractionMeta
  extractionConfidence?: number | null
}

/**
 * Convert extraction result fields to vendor record input
 */
export function extractionToVendorRecordInput(
  extractionFields: {
    companyName: string
    boothNumber: string
    contactPerson: string
    email: string
    phone: string
    website: string
    address: string
    countryOfOrigin: string
    brandNames: string
    notes: string
  },
  eventId: string,
  images: VendorImageRecord[],
  sourceInfoImageId?: string,
  extractionMeta?: VendorExtractionMeta
): VendorRecordCreateInput {
  return {
    eventId,
    companyName: extractionFields.companyName,
    boothNumber: extractionFields.boothNumber,
    contactName: extractionFields.contactPerson,
    email: extractionFields.email,
    phone: extractionFields.phone,
    website: extractionFields.website,
    address: extractionFields.address,
    countryOfOrigin: extractionFields.countryOfOrigin,
    brandNames: extractionFields.brandNames,
    notes: extractionFields.notes,
    images,
    sourceInfoImageId,
    extractionMeta,
  }
}
