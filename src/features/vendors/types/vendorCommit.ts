/**
 * Vendor commit types for the commit-reviewed-vendor-document flow.
 *
 * These types represent the contract between:
 * - Frontend review screen
 * - Backend commit edge function
 * - Final vendor and vendor_images tables
 */

/**
 * Reviewed vendor document payload.
 *
 * This is the user-reviewed and confirmed data that will be committed
 * to the vendors table. It includes all editable fields from the review screen.
 */
export interface ReviewedVendorDocument {
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
}

/**
 * Vendor image reference for commit.
 *
 * Links a source image to the created vendor record.
 */
export interface VendorImageReference {
  storage_path: string
  public_url?: string | null
  image_type: 'business_card' | 'booth_sign' | 'brochure' | 'logo' | 'gallery'
  is_primary: boolean
}

/**
 * Commit payload for vendor creation.
 *
 * This is sent to the commit-reviewed-vendor-document edge function.
 */
export interface CommitVendorPayload {
  scan_session_id: string
  event_id: string
  reviewed_document: ReviewedVendorDocument
  source_image?: {
    storage_path: string
    public_url?: string | null
  } | null
}

/**
 * Commit response from backend.
 *
 * Returns the created vendor ID and related record IDs.
 */
export interface CommitVendorResponse {
  vendor_id: string
  vendor_image_id?: string | null
  scan_session_id: string
}

/**
 * Commit error types for better error handling.
 */
export type CommitErrorType =
  | 'validation_failed'
  | 'scan_session_not_found'
  | 'permission_denied'
  | 'vendor_creation_failed'
  | 'image_creation_failed'
  | 'scan_session_update_failed'
  | 'unknown_error'

export interface CommitError {
  type: CommitErrorType
  message: string
  details?: unknown
}
