/**
 * Shared helpers for post-commit scan_sessions updates.
 * Keep resource creation and response handling local to each commit flow.
 */

export interface FinalizeCommitArgs {
  supabaseAdmin: any
  scanSessionId: string
  reviewedPayload: unknown
  reviewedBy: string
  extraUpdates: Record<string, unknown>
}

/**
 * Updates a scan session with reviewed/commit metadata after successful resource creation.
 *
 * Handles the common reviewed/commit fields and accepts function-specific linkage fields
 * via extraUpdates. Returns the raw Supabase result so the caller can decide how to handle
 * errors and logging.
 *
 * @param args - The commit finalization arguments
 * @returns The raw Supabase update result
 */
export async function finalizeScanSessionCommit({
  supabaseAdmin,
  scanSessionId,
  reviewedPayload,
  reviewedBy,
  extraUpdates,
}: FinalizeCommitArgs) {
  return await supabaseAdmin
    .from('scan_sessions')
    .update({
      reviewed_payload: reviewedPayload,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      ...extraUpdates,
    })
    .eq('id', scanSessionId)
}
