/**
 * Vendor capture draft types for local persistence.
 *
 * Drafts are stored locally before upload and scan session creation.
 * They support offline workflows and interrupted capture sessions.
 */

/**
 * Status of a vendor capture draft.
 */
export type VendorDraftStatus =
  | 'draft'           // Initial state, image selected
  | 'uploading'       // Image upload in progress
  | 'scan_created'    // Scan session created
  | 'extracting'      // AI extraction in progress
  | 'review'          // Ready for user review
  | 'committing'      // Committing to database
  | 'failed'          // Error occurred
  | 'completed'       // Fully committed

/**
 * Local image reference before upload.
 */
export interface LocalVendorImage {
  id: string
  uri: string                // Local file URI or blob URL
  name: string               // Original filename
  type: string               // MIME type
  size: number               // File size in bytes
  width?: number
  height?: number
  capturedAt: string
}

/**
 * Scan type for vendor capture.
 */
export type VendorScanType =
  | 'vendor_card'
  | 'vendor_signage'
  | 'vendor_brochure'
  | 'vendor_catalog'

/**
 * Extracted vendor data (populated after AI extraction).
 *
 * Uses snake_case to align with database schema and extraction types.
 * Allows null to match database nullable columns.
 */
export interface ExtractedVendorData {
  // Canonical (camelCase) for frontend usage
  companyName?: string
  boothNumber?: string | null
  contactPerson?: string | null
  websiteUrl?: string | null
  countryOfOrigin?: string | null
  brandNames?: string[] | null

  // Legacy (snake_case) retained for compatibility
  company_name?: string
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
}

/**
 * Vendor capture draft - local state for vendor capture workflow.
 */
export interface VendorDraft {
  id: string
  eventId: string
  status: VendorDraftStatus
  localImages: LocalVendorImage[]
  scanSessionId: string | null
  scanType: VendorScanType
  sourceImagePath: string | null    // Storage path after upload
  sourceImageUrl?: string | null     // Public URL after upload
  extractedVendor: ExtractedVendorData | null
  error: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Draft storage operations.
 */
export interface VendorDraftStore {
  save(draft: VendorDraft): Promise<void>
  get(id: string): Promise<VendorDraft | null>
  getAll(): Promise<VendorDraft[]>
  delete(id: string): Promise<void>
  update(id: string, updates: Partial<VendorDraft>): Promise<void>
}
