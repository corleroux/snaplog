/**
 * Frontend API layer for committing reviewed vendor data.
 *
 * This module handles the frontend side of the commit-reviewed-vendor-document flow:
 * - Validates commit payload
 * - Calls backend edge function
 * - Handles loading and error states
 * - Returns committed vendor result
 *
 * This preserves the separation between extraction and commit,
 * and maintains full auditability through the scan session.
 */

import { invokeEdgeFunction, supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import {
  commitVendorPayloadSchema,
  type CommitVendorPayload,
  type CommitVendorResponse,
} from '@/lib/validation/extraction/vendorExtraction.schema'
import type {
  ReviewedVendorDocument,
  CommitError,
  CommitErrorType,
} from '@/features/vendors/types/vendorCommit'

const logger = createLogger('VendorCommit')

/**
 * Commit reviewed vendor data and create final vendor record.
 *
 * This function:
 * 1. Validates the commit payload
 * 2. Calls the commit-reviewed-vendor-document edge function
 * 3. Handles authentication via Supabase auth
 * 4. Returns the created vendor IDs
 *
 * @param params - Commit parameters including scan session, event, and reviewed data
 * @returns Committed vendor IDs
 * @throws CommitError if validation fails or commit operation fails
 */
export async function commitReviewedVendor(params: {
  scanSessionId: string
  eventId: string
  reviewedDocument: ReviewedVendorDocument
  sourceImagePath?: string | null
  sourceImageUrl?: string | null
}): Promise<CommitVendorResponse> {
  const { scanSessionId, eventId, reviewedDocument, sourceImagePath, sourceImageUrl } = params

  // Validate scan session ID format
  try {
    validateUUID(scanSessionId, 'scan_session_id')
    validateUUID(eventId, 'event_id')
  } catch (err) {
    throw createCommitError('validation_failed', err instanceof Error ? err.message : 'Invalid UUID format')
  }

  // Validate reviewed document has required fields
  if (!reviewedDocument.company_name || reviewedDocument.company_name.trim() === '') {
    throw createCommitError('validation_failed', 'Company name is required')
  }

  // Build commit payload
  const payload: CommitVendorPayload = {
    scan_session_id: scanSessionId,
    event_id: eventId,
    reviewed_document: {
      company_name: reviewedDocument.company_name.trim(),
      booth_number: reviewedDocument.booth_number?.trim() || null,
      contact_person: reviewedDocument.contact_person?.trim() || null,
      email: reviewedDocument.email?.trim() || null,
      phone: reviewedDocument.phone?.trim() || null,
      whatsapp: reviewedDocument.whatsapp?.trim() || null,
      website_url: reviewedDocument.website_url?.trim() || null,
      address: reviewedDocument.address?.trim() || null,
      country_of_origin: reviewedDocument.country_of_origin?.trim() || null,
      brand_names: reviewedDocument.brand_names || null,
      notes: reviewedDocument.notes?.trim() || null,
    },
    source_image: sourceImagePath
      ? {
          storage_path: sourceImagePath,
          public_url: sourceImageUrl || null,
        }
      : null,
  }

  // Validate payload with Zod
  const validationResult = commitVendorPayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw createCommitError('validation_failed', `Invalid commit payload: ${errors}`)
  }

  try {
    // Call the edge function with explicit auth header
    const { data, error } = await invokeEdgeFunction<CommitVendorResponse>(
      'commit-reviewed-vendor-document',
      {
        body: payload,
      }
    )

    if (error) {
      logger.error('Commit vendor function error', { error: String(error) })

      // Check if it's an already_committed error
      if (error.message?.includes('already committed')) {
        throw createCommitError('validation_failed', 'Vendor already committed for this scan session')
      }

      throw createCommitError('unknown_error', error.message || 'Failed to commit vendor')
    }

    if (!data) {
      throw createCommitError('unknown_error', 'No response from commit function')
    }

    return data

  } catch (err) {
    // Re-throw CommitError as-is
    if (isCommitError(err)) {
      throw err
    }

    // Wrap other errors
    logger.error('Commit vendor error', { error: String(err) })
    throw createCommitError('unknown_error', err instanceof Error ? err.message : 'Unknown error')
  }
}

/**
 * Check if a scan session has already been committed.
 *
 * This can be used to prevent duplicate commits or to show the
 * existing vendor if the user navigates back to the review screen.
 */
export async function isVendorAlreadyCommitted(scanSessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select('vendor_id')
    .eq('id', scanSessionId)
    .single()

  if (error || !data) {
    return false
  }

  return data.vendor_id !== null
}

/**
 * Get the vendor ID for a committed scan session.
 */
export async function getCommittedVendorId(scanSessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select('vendor_id')
    .eq('id', scanSessionId)
    .single()

  if (error || !data) {
    return null
  }

  return data.vendor_id
}

// Helper functions

function validateUUID(str: string, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(str)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`)
  }
}

function createCommitError(type: CommitErrorType, message: string): CommitError {
  return {
    type,
    message,
  }
}

function isCommitError(err: unknown): err is CommitError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    'message' in err &&
    typeof err.type === 'string' &&
    typeof err.message === 'string'
  )
}
