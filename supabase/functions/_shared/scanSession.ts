/**
 * Shared scan_sessions update helpers for extraction flows.
 * Keeps extraction status transitions consistent across extract functions.
 */

export interface ExtractionMetadata {
  extractor_name: string
  extractor_model: string
  extractor_version: string
}

export interface ExtractionResult {
  raw_payload: unknown
  normalized_payload: unknown
  metadata: ExtractionMetadata
}

/**
 * Marks a scan session as processing.
 * Clears any previous error message.
 */
export async function markExtractionProcessing(
  supabase: any,
  scanSessionId: string
) {
  return await supabase
    .from('scan_sessions')
    .update({
      extraction_status: 'processing',
      error_message: null,
    })
    .eq('id', scanSessionId)
}

/**
 * Marks a scan session extraction as complete.
 * Stores raw payload, normalized payload, and extractor metadata.
 */
export async function markExtractionSucceeded(
  supabase: any,
  scanSessionId: string,
  result: ExtractionResult
) {
  return await supabase
    .from('scan_sessions')
    .update({
      raw_payload: { original_response: result.raw_payload },
      normalized_payload: result.normalized_payload,
      extraction_status: 'complete',
      extractor_name: result.metadata.extractor_name,
      extractor_model: result.metadata.extractor_model,
      extractor_version: result.metadata.extractor_version,
      error_message: null,
    })
    .eq('id', scanSessionId)
}

/**
 * Marks a scan session extraction as failed.
 * Stores the error message and error type for debugging.
 */
export async function markExtractionFailed(
  supabase: any,
  scanSessionId: string,
  errorMessage: string,
  errorType?: string
) {
  const updateData: Record<string, unknown> = {
    extraction_status: 'failed',
    error_message: errorMessage,
  }

  if (errorType) {
    updateData.error_type = errorType
  }

  return await supabase
    .from('scan_sessions')
    .update(updateData)
    .eq('id', scanSessionId)
}
