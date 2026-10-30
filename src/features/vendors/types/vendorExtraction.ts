/**
 * Vendor extraction types for AI-based vendor data extraction.
 *
 * These types represent the contract between:
 * - AI extraction service (edge function)
 * - Frontend review screen
 * - Final commit payload
 */

/**
 * Extracted vendor document from AI extraction.
 *
 * This is the normalized output from the AI extraction service,
 * populated in the scan_session's normalized_payload field.
 */
export interface ExtractedVendorDocument {
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
 * Review form values for vendor review screen.
 *
 * Matches the editable fields in the review UI.
 * All fields are optional to allow partial edits.
 */
export interface VendorReviewFormValues {
  company_name: string
  booth_number: string
  contact_person: string
  email: string
  phone: string
  whatsapp: string
  website_url: string
  address: string
  country_of_origin: string
  brand_names: string
  notes: string
}

/**
 * Confidence score for a specific field.
 */
export interface FieldConfidence {
  field: string
  score: number
  reason?: string
}

/**
 * Extraction metadata from the AI service.
 */
export interface ExtractionMetadata {
  extractor_name: string
  extractor_model: string
  extractor_version: string
  confidence_scores?: Record<string, number>
}

/**
 * Complete extraction response including document and metadata.
 */
export interface VendorExtractionResponse {
  document: ExtractedVendorDocument
  metadata: ExtractionMetadata
}
