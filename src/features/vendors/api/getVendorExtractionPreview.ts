/**
 * Vendor extraction preview adapter.
 *
 * This module loads extracted vendor data for the review screen.
 *
 * CANONICAL INTEGRATION:
 * - Reads normalized_payload from scan_sessions (written by extract-vendor-document)
 * - Requires extraction to be completed before loading
 *
 * EXTRACTION VS COMMIT:
 * - Extraction: AI extracts data, stored in normalized_payload (extract-vendor-document)
 * - Review: User reviews and edits extracted data (this screen)
 * - Commit: Final data written to vendors table (commit-reviewed-vendor-document)
 *
 * The extraction/commit separation is preserved - this only loads preview data.
 */

import type {
  ExtractedVendorDocument,
} from '@/features/vendors/types/vendorExtraction'
import { vendorExtractionResponseSchema } from '@/lib/validation/extraction/vendorExtraction.schema'
import { supabase } from '@/lib/supabase/client'

export interface GetVendorExtractionPreviewParams {
  scanSessionId: string
}

export interface GetVendorExtractionPreviewResult {
  document: ExtractedVendorDocument
  sourceImageUrl: string | null
}

/**
 * Get vendor extraction preview for a scan session.
 *
 * This function:
 * 1. Fetches the scan session from the database
 * 2. Returns normalized_payload if present
 * 3. Throws error if extraction is not completed
 *
 * @param params - Scan session ID
 * @returns Extracted vendor document with source image URL
 * @throws Error if scan session not found, fetch fails, or extraction not completed
 */
export async function getVendorExtractionPreview({
  scanSessionId,
}: GetVendorExtractionPreviewParams): Promise<GetVendorExtractionPreviewResult> {
  // Fetch the scan session
  const { data: scanSession, error } = await supabase
    .from('scan_sessions')
    .select('*')
    .eq('id', scanSessionId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch scan session: ${error.message}`)
  }

  if (!scanSession) {
    throw new Error(`Scan session not found: ${scanSessionId}`)
  }

  // Check extraction status
  if (scanSession.extraction_status === 'failed') {
    throw new Error(`Extraction failed: ${scanSession.error_message || 'Unknown error'}`)
  }

  if (scanSession.extraction_status === 'pending' || scanSession.extraction_status === 'processing') {
    throw new Error('Extraction in progress. Please wait for AI processing to finish.')
  }

  // Check if we have a normalized_payload from extraction
  if (!scanSession.normalized_payload) {
    throw new Error('Extraction not completed. No data available.')
  }

  // Validate the payload structure
  const validated = validateExtractionPayload(scanSession.normalized_payload)

  return {
    document: validated.document,
    sourceImageUrl: scanSession.source_image_url,
  }
}



/**
 * Validate extraction payload structure.
 *
 * Ensures the normalized_payload from scan_sessions has the expected shape.
 * This provides runtime safety and better error messages.
 */
function validateExtractionPayload(payload: unknown) {
  return vendorExtractionResponseSchema.parse(payload)
}

/**
 * Check if a scan session is ready for review.
 *
 * A session is ready for review when:
 * - It exists
 * - Has a source image
 * - Extraction is completed with normalized_payload
 */
export async function isScanSessionReadyForReview(
  scanSessionId: string
): Promise<boolean> {
  const { data: scanSession, error } = await supabase
    .from('scan_sessions')
    .select('id, source_image_url, normalized_payload, extraction_status')
    .eq('id', scanSessionId)
    .single()

  if (error || !scanSession) {
    return false
  }

  return scanSession.extraction_status === 'complete' && !!scanSession.normalized_payload
}
