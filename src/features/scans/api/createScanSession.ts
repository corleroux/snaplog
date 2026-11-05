/**
 * Create a scan session for vendor or fabric extraction.
 *
 * Scan sessions track the lifecycle of AI-assisted extraction workflows,
 * preserving raw, normalized, and reviewed payloads for auditability.
 */

import { supabase } from '@/lib/supabase/client'
import type { ScanSession } from '@/lib/supabase/types'

/**
 * Vendor scan types for the scan_session table.
 */
export type VendorScanType =
  | 'vendor_card'
  | 'vendor_signage'
  | 'vendor_brochure'
  | 'vendor_catalog'

/**
 * Fabric/scan types for the scan_session table.
 */
export type FabricScanType =
  | 'product_tag'
  | 'stock_sheet'
  | 'fabric_card'
  | 'multi_variant_sheet'

/**
 * Video scan types for the scan_session table (FR-VID).
 */
export type VideoScanType = 'rack_video'

/**
 * All supported scan types.
 */
export type ScanType = VendorScanType | FabricScanType | VideoScanType

export interface CreateScanSessionParams {
  eventId: string
  scanType: ScanType
  sourceImagePath?: string | null
  sourceImageUrl?: string | null
  vendorId?: string | null      // Required for fabric scans (links style to vendor)
}

/**
 * Create a new scan session in pending status.
 *
 * The scan session will be updated later with:
 * - extraction_status when AI processing starts
 * - raw_payload and normalized_payload after extraction
 * - reviewed_payload after user review and commit
 *
 * For fabric scans, vendorId should be provided to link the style to a vendor.
 *
 * @param params - Scan session parameters
 * @returns The created scan session
 * @throws Error if creation fails
 */
export async function createScanSession({
  eventId,
  scanType,
  sourceImagePath = null,
  sourceImageUrl = null,
  vendorId = null,
}: CreateScanSessionParams): Promise<ScanSession> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  // Create the scan session
  const { data, error } = await supabase
    .from('scan_sessions')
    .insert({
      event_id: eventId,
      vendor_id: vendorId,
      scan_type: scanType,
      source_image_path: sourceImagePath,
      source_image_url: sourceImageUrl,
      extraction_status: 'pending',
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create scan session: ${error.message}`)
  }

  return data
}

/**
 * Mark scan session as failed.
 */
export async function markScanSessionFailed(
  scanSessionId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('scan_sessions')
    .update({
      extraction_status: 'failed',
      error_message: errorMessage,
    })
    .eq('id', scanSessionId)

  if (error) {
    throw new Error(`Failed to mark scan session as failed: ${error.message}`)
  }
}
