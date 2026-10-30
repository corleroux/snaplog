/**
 * Fabric extraction adapter.
 *
 * This module handles the frontend side of the extract-fabric-document flow:
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
import { extractFabricRequestSchema } from '@/lib/validation/extraction/extractionRequest.schema'
import { classifyExtractionError, withRetry, withExtractionTimeout, type ExtractionEntityType } from '@/lib/monitoring'

const logger = createLogger('StyleExtract')
import type {
  FabricExtractionResponse,
} from '@/features/styles/types/fabricExtraction'

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
 * Extract fabric/style data from uploaded document(s).
 *
 * This function:
 * 1. Validates the scan session, event, and vendor IDs
 * 2. Calls the extract-fabric-document edge function
 * 3. Handles authentication via Supabase auth
 * 4. Returns the extracted fabric data
 *
 * @param params - Extraction parameters including scan session, event, vendor, storage info
 * @returns Extracted fabric document with metadata
 * @throws ExtractionError if validation fails or extraction fails
 */
export async function extractFabricDocument(params: {
  scanSessionId: string
  eventId: string
  vendorId: string
  storagePath: string
  mimeType: string
  scanType: string
}): Promise<FabricExtractionResponse> {
  const { scanSessionId, eventId, vendorId, storagePath, mimeType, scanType } = params

  // Build extraction payload with top-level storage_path and mime_type
  // NOTE: Edge function expects these as top-level fields, NOT nested in source_image
  const payload = {
    scan_session_id: scanSessionId,
    event_id: eventId,
    vendor_id: vendorId,
    storage_path: storagePath,
    mime_type: mimeType,
    scan_type: scanType,
  }

  // Validate payload with Zod before sending to edge function
  const validationResult = extractFabricRequestSchema.safeParse(payload)
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
          const { data, error } = await supabase.functions.invoke<FabricExtractionResponse>(
            'extract-fabric-document',
            { body: payload }
          )

          if (error) {
            logger.error('Extract fabric function error', { error: String(error) })
            throw new Error(error.message || 'Extraction failed')
          }

          if (!data) {
            throw new Error('No response from extraction function')
          }

          return data
        },
        'fabric' as ExtractionEntityType,
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
    logger.error('Extract fabric error', {
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
export async function isFabricExtractionComplete(scanSessionId: string): Promise<boolean> {
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
export async function getFabricExtractionStatus(scanSessionId: string): Promise<{
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
