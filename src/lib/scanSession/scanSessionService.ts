/**
 * Scan Session Service
 *
 * Handles creating and managing scan sessions for AI extraction.
 *
 * Scan sessions are the audit trail for extraction:
 * - They track the original extraction request
 * - They store raw_payload, normalized_payload, and reviewed_payload
 * - They track extraction status and errors
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import { getCurrentUserId } from '@/lib/supabase/auth'

const logger = createLogger('ScanSession')

export type ScanSessionStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'committed'

export interface CreateScanSessionOptions {
  /** Event ID */
  eventId: string
  /** Vendor ID (optional, for style extraction) */
  vendorId?: string
  /** Scan type for extraction context */
  scanType: string
  /** Source image storage path (optional, can be set later) */
  sourceImagePath?: string
  /** Source image public URL (optional) */
  sourceImageUrl?: string
}

export interface ScanSessionRecord {
  id: string
  event_id: string
  vendor_id: string | null
  scan_type: string
  source_image_path: string | null
  source_image_url: string | null
  extraction_status: ScanSessionStatus
  raw_payload: unknown | null
  normalized_payload: unknown | null
  reviewed_payload: unknown | null
  style_id: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

/**
 * Create a new scan session.
 *
 * @param options - Scan session creation options
 * @returns Created scan session ID
 * @throws Error if creation fails
 */
export async function createScanSession(options: CreateScanSessionOptions): Promise<string> {
  const { eventId, vendorId, scanType, sourceImagePath, sourceImageUrl } = options

  // Get current user ID for created_by
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('User must be authenticated to create scan sessions')
  }

  const { data, error } = await supabase
    .from('scan_sessions')
    .insert({
      event_id: eventId,
      vendor_id: vendorId || null,
      scan_type: scanType,
      source_image_path: sourceImagePath || null,
      source_image_url: sourceImageUrl || null,
      extraction_status: 'pending',
      raw_payload: null,
      normalized_payload: null,
      reviewed_payload: null,
      style_id: null, // Will be set on commit
      error_message: null,
      created_by: userId,
    })
    .select('id')
    .single()

  if (error) {
    logger.error('Scan session creation error', { error: String(error) })
    throw new Error(`Failed to create scan session: ${error.message}`)
  }

  if (!data) {
    throw new Error('No data returned from scan session creation')
  }

  return data.id
}

/**
 * Get a scan session by ID.
 *
 * @param scanSessionId - Scan session ID
 * @returns Scan session record or null
 */
export async function getScanSession(scanSessionId: string): Promise<ScanSessionRecord | null> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select('*')
    .eq('id', scanSessionId)
    .single()

  if (error) {
    logger.error('Scan session fetch error', { error: String(error) })
    return null
  }

  return data
}

/**
 * Update scan session status.
 *
 * @param scanSessionId - Scan session ID
 * @param status - New status
 * @param errorMessage - Optional error message (for failed status)
 */
export async function updateScanSessionStatus(
  scanSessionId: string,
  status: ScanSessionStatus,
  errorMessage?: string
): Promise<void> {
  const updates: {
    extraction_status: ScanSessionStatus
    error_message?: string | null
  } = {
    extraction_status: status,
  }

  if (errorMessage) {
    updates.error_message = errorMessage
  } else if (status !== 'failed') {
    updates.error_message = null
  }

  const { error } = await supabase
    .from('scan_sessions')
    .update(updates)
    .eq('id', scanSessionId)

  if (error) {
    logger.error('Scan session status update error', { error: String(error) })
    throw new Error(`Failed to update scan session status: ${error.message}`)
  }
}

/**
 * Update scan session with source image info.
 *
 * @param scanSessionId - Scan session ID
 * @param storagePath - Storage path
 * @param imageUrl - Signed URL for the source image
 */
export async function updateScanSessionSourceImage(
  scanSessionId: string,
  storagePath: string,
  imageUrl: string
): Promise<void> {
  const { error } = await supabase
    .from('scan_sessions')
    .update({
      source_image_path: storagePath,
      source_image_url: imageUrl,
    })
    .eq('id', scanSessionId)

  if (error) {
    logger.error('Scan session source image update error', { error: String(error) })
    throw new Error(`Failed to update scan session source image: ${error.message}`)
  }
}

/**
 * Check if a scan session has been committed.
 *
 * @param scanSessionId - Scan session ID
 * @returns true if committed (has vendor_id or style_id)
 */
export async function isScanSessionCommitted(scanSessionId: string): Promise<boolean> {
  const { data } = await supabase
    .from('scan_sessions')
    .select('vendor_id, style_id')
    .eq('id', scanSessionId)
    .single()

  return data?.vendor_id !== null || data?.style_id !== null
}

/**
 * Get the committed vendor or style ID from a scan session.
 *
 * @param scanSessionId - Scan session ID
 * @returns Object with vendor_id or style_id, or null
 */
export async function getCommittedEntityId(scanSessionId: string): Promise<{
  vendorId: string | null
  styleId: string | null
}> {
  const { data } = await supabase
    .from('scan_sessions')
    .select('vendor_id, style_id')
    .eq('id', scanSessionId)
    .single()

  if (!data) {
    return { vendorId: null, styleId: null }
  }

  return {
    vendorId: data.vendor_id,
    styleId: data.style_id,
  }
}
