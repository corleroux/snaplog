/**
 * Shared scan_sessions update helpers for extraction flows.
 * Keeps extraction status transitions consistent across extract functions.
 */

import type { ExtractionResult as ProviderExtractionResult } from './providers/types.ts'

export interface ExtractionMetadata {
  extractor_name: string
  extractor_model: string
  extractor_version: string
}

/**
 * Extraction-run provenance persisted on scan_sessions (migration 084,
 * FR-MOD-01): which schema and which provider/model produced the run, with
 * latency, token usage and estimated cost.
 */
export interface ExtractionRunInfo {
  schema_type: string
  schema_version: number
  provider: string
  model: string
  latency_ms: number
  usage: { input_tokens: number | null; output_tokens: number | null } | null
  cost_usd: number | null
}

export interface ExtractionResult {
  raw_payload: unknown
  normalized_payload: unknown
  metadata: ExtractionMetadata
  run?: ExtractionRunInfo
}

/**
 * Map a provider ExtractionResult + catalogue schema onto the
 * scan_sessions run columns. Cost stays null until pricing lands (FR-MOD-04).
 */
export function buildExtractionRunInfo(
  extraction: ProviderExtractionResult,
  schema: { slug: string; version: number }
): ExtractionRunInfo {
  return {
    schema_type: schema.slug,
    schema_version: schema.version,
    provider: extraction.provider,
    model: extraction.model,
    latency_ms: extraction.latencyMs,
    usage: extraction.usage
      ? {
          input_tokens: extraction.usage.inputTokens ?? null,
          output_tokens: extraction.usage.outputTokens ?? null,
        }
      : null,
    cost_usd: extraction.usage?.costUsd ?? null,
  }
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
 * Stores raw payload, normalized payload, extractor metadata and (when
 * provided) the extraction-run provenance columns from migration 084.
 */
export async function markExtractionSucceeded(
  supabase: any,
  scanSessionId: string,
  result: ExtractionResult
) {
  const update: Record<string, unknown> = {
    raw_payload: { original_response: result.raw_payload },
    normalized_payload: result.normalized_payload,
    extraction_status: 'complete',
    extractor_name: result.metadata.extractor_name,
    extractor_model: result.metadata.extractor_model,
    extractor_version: result.metadata.extractor_version,
    error_message: null,
  }

  if (result.run) {
    Object.assign(update, result.run)
  }

  return await supabase
    .from('scan_sessions')
    .update(update)
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
