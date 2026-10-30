/**
 * Vendor extraction adapter.
 *
 * This module handles the frontend side of the extract-vendor-document flow:
 * - Validates extraction request payload
 * - Calls backend edge function
 * - Handles loading and error states
 * - Returns extraction response
 *
 * This preserves the separation between extraction and commit,
 * and maintains full auditability through the scan session.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import { extractVendorRequestSchema } from '@/lib/validation/extraction/extractionRequest.schema'
import { classifyExtractionError, withRetry, withExtractionTimeout, type ExtractionEntityType } from '@/lib/monitoring'

const logger = createLogger('VendorExtract')
import type {
  VendorExtractionResponse,
} from '@/features/vendors/types/vendorExtraction'

/**
 * Extraction error types for structured error handling.
 */
export type ExtractionErrorType =
  | 'validation_failed'
  | 'network_error'
  | 'extraction_failed'
  | 'unknown_error'

/**
 * Structured extraction error with user-facing context.
 */
export interface ExtractionError {
  type: ExtractionErrorType
  message: string
  /** User-friendly error classification */
  userMessage?: string
  /** Suggested action for the user */
  suggestedAction?: string
  /** Whether this error can be retried */
  retryable?: boolean
}

/**
 * Extract vendor data from an uploaded document.
 *
 * This function:
 * 1. Validates the scan session and event IDs
 * 2. Calls the extract-vendor-document edge function
 * 3. Handles authentication via Supabase auth
 * 4. Returns the extracted vendor data
 *
 * @param params - Extraction parameters including scan session, event, storage info
 * @returns Extracted vendor document with metadata
 * @throws ExtractionError if validation fails or extraction fails
 */
export async function extractVendorDocument(params: {
  scanSessionId: string
  eventId: string
  storagePath: string
  mimeType: string
  scanType: string
}): Promise<VendorExtractionResponse> {
  const { scanSessionId, eventId, storagePath, mimeType, scanType } = params

  // Build extraction payload with top-level storage_path and mime_type
  // NOTE: Edge function expects these as top-level fields, NOT nested in source_image
  const payload = {
    scan_session_id: scanSessionId,
    event_id: eventId,
    storage_path: storagePath,
    mime_type: mimeType,
    scan_type: scanType,
  }

  // Validate payload with Zod before sending to edge function
  const validationResult = extractVendorRequestSchema.safeParse(payload)
  if (!validationResult.success) {
    const errors = validationResult.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ')
    throw createExtractionError('validation_failed', `Invalid payload: ${errors}`)
  }

  try {
    // Call the edge function with retry for transient errors and timeout protection
    const result = await withExtractionTimeout(
      async () => withRetry(
        async () => {
          const { data, error } = await supabase.functions.invoke<VendorExtractionResponse>(
            'extract-vendor-document',
            { body: payload }
          )

          if (error) {
            logger.error('Extract vendor function error', { error: String(error) })
            throw new Error(error.message || 'Extraction failed')
          }

          if (!data) {
            throw new Error('No response from extraction function')
          }

          return data
        },
        'vendor' as ExtractionEntityType,
        scanType,
        scanSessionId,
        { maxRetries: 2, baseDelayMs: 2000 }
      ),
      { timeoutMs: 30000 }
    )

    return result

  } catch (err) {
    // Re-throw ExtractionError as-is
    if (isExtractionError(err)) {
      throw err
    }

    // Classify and wrap with user-facing context
    const classification = classifyExtractionError(err)
    logger.error('Extract vendor error', {
      error: String(err),
      category: classification.category,
      retryable: classification.retryable,
    })

    const typeMap: Record<string, ExtractionErrorType> = {
      network: 'network_error',
      timeout: 'network_error',
      server: 'extraction_failed',
      auth: 'extraction_failed',
      validation: 'validation_failed',
      unknown: 'unknown_error',
    }

    throw createExtractionError(
      typeMap[classification.category] ?? 'unknown_error',
      err instanceof Error ? err.message : String(err),
      classification.userMessage,
      classification.suggestedAction,
      classification.retryable,
    )
  }
}

/**
 * Check if a scan session has extraction results available.
 *
 * This can be used to determine if extraction has completed.
 */
export async function isVendorExtractionComplete(scanSessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select('extraction_status, normalized_payload')
    .eq('id', scanSessionId)
    .single()

  if (error || !data) {
    return false
  }

  return data.extraction_status === 'complete' && data.normalized_payload !== null
}

/**
 * Get extraction status for a scan session.
 *
 * Returns the current status of the extraction process.
 */
export async function getVendorExtractionStatus(scanSessionId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string | null
}> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select('extraction_status, error_message')
    .eq('id', scanSessionId)
    .single()

  if (error || !data) {
    return { status: 'pending' }
  }

  return {
    status: data.extraction_status || 'pending',
    error: data.error_message,
  }
}

// Helper functions

function createExtractionError(
  type: ExtractionErrorType,
  message: string,
  userMessage?: string,
  suggestedAction?: string,
  retryable?: boolean,
): ExtractionError {
  return {
    type,
    message,
    userMessage,
    suggestedAction,
    retryable,
  }
}

function isExtractionError(err: unknown): err is ExtractionError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    'message' in err &&
    typeof err.type === 'string' &&
    typeof err.message === 'string'
  )
}
