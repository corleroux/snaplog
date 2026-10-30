/**
 * Frontend API layer for committing reviewed fabric data.
 *
 * This module handles the frontend side of the commit-reviewed-fabric-document flow:
 * - Validates commit payload
 * - Calls backend edge function
 * - Handles loading and error states
 * - Returns committed style result
 *
 * This preserves the separation between extraction and commit,
 * and maintains full auditability through the scan session.
 */

import { invokeEdgeFunction, supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import {
  commitFabricPayloadSchema,
  type CommitFabricPayload,
  type CommitFabricResponse,
} from '@/lib/validation/extraction/fabricExtraction.schema'
import type {
  ReviewedFabricDocument,
  CommitError,
  CommitErrorType,
} from '../types/fabricCommit'

const logger = createLogger('StyleCommit')

/**
 * Commit reviewed fabric data and create final business records.
 *
 * This function:
 * 1. Validates the commit payload
 * 2. Calls the commit-reviewed-fabric-document edge function
 * 3. Handles authentication via Supabase auth
 * 4. Returns the created record IDs
 *
 * @param params - Commit parameters including scan session, event, vendor, and reviewed data
 * @returns Committed fabric record IDs
 * @throws CommitError if validation fails or commit operation fails
 */
export async function commitReviewedFabric(params: {
  scanSessionId: string
  eventId: string
  vendorId: string
  reviewedDocument: ReviewedFabricDocument
  sourceImagePaths?: string[] | null
  sourceImageUrls?: (string | null)[] | null
  editDeltas?: Array<{ field: string; original: unknown; modified: unknown }>
}): Promise<CommitFabricResponse> {
  const {
    scanSessionId,
    eventId,
    vendorId,
    reviewedDocument,
    sourceImagePaths,
    sourceImageUrls,
    editDeltas,
  } = params

  // Validate UUID format
  try {
    validateUUID(scanSessionId, 'scan_session_id')
    validateUUID(eventId, 'event_id')
    validateUUID(vendorId, 'vendor_id')
  } catch (err) {
    throw createCommitError('validation_failed', err instanceof Error ? err.message : 'Invalid UUID format')
  }

  // Validate reviewed document has required structure
  if (!reviewedDocument.style) {
    throw createCommitError('validation_failed', 'Style data is required')
  }

  // Build source images array
  const sourceImages = sourceImagePaths?.map((path, index) => ({
    storage_path: path,
    public_url: sourceImageUrls?.[index] || null,
  })) || null

  // Build commit payload
  const payload: CommitFabricPayload = {
    scan_session_id: scanSessionId,
    event_id: eventId,
    vendor_id: vendorId,
    reviewed_document: reviewedDocument,
    source_images: sourceImages,
    ...(editDeltas && { edit_deltas: editDeltas }),
  }

  // Validate payload with Zod
  const validationResult = commitFabricPayloadSchema.safeParse(payload)
  if (!validationResult.success) {
    const errors = validationResult.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
    throw createCommitError('validation_failed', `Invalid commit payload: ${errors}`)
  }

  try {
    // Call the edge function with explicit auth header
    const { data, error } = await invokeEdgeFunction<CommitFabricResponse>(
      'commit-reviewed-fabric-document',
      {
        body: payload,
      }
    )

    if (error) {
      logger.error('Commit fabric function error', { error: String(error) })

      // Check if it's an already_committed error
      if (error.message?.includes('already committed')) {
        throw createCommitError('validation_failed', 'Fabric already committed for this scan session')
      }

      throw createCommitError('unknown_error', error.message || 'Failed to commit fabric')
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
    logger.error('Commit fabric error', { error: String(err) })
    throw createCommitError('unknown_error', err instanceof Error ? err.message : 'Unknown error')
  }
}

/**
 * Check if a scan session has already been committed.
 *
 * This can be used to prevent duplicate commits or to show the
 * existing style if the user navigates back to the review screen.
 */
export async function isFabricAlreadyCommitted(scanSessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select('style_id')
    .eq('id', scanSessionId)
    .single()

  if (error || !data) {
    return false
  }

  return data.style_id !== null
}

/**
 * Get the fabric style ID for a committed scan session.
 */
export async function getCommittedStyleId(scanSessionId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select('style_id')
    .eq('id', scanSessionId)
    .single()

  if (error || !data) {
    return null
  }

  return data.style_id
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
