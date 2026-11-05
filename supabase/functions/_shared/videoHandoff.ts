/**
 * Video handoff contract (FR-VID).
 *
 * Pure payload builder for the edge → Modal handoff, shared between
 * process-video-document and its tests. The Modal webhook
 * (modal/video_pipeline.py::process_video) expects exactly these fields.
 */

export interface VideoHandoffPayload {
  job_id: string
  scan_session_id: string
  video_url: string
  catalogue_type: string
  callback_base_url: string
  callback_secret: string
}

export function buildHandoffPayload(args: {
  jobId: string
  scanSessionId: string
  signedVideoUrl: string
  catalogueType: string
  supabaseUrl: string
  callbackSecret: string
}): VideoHandoffPayload {
  return {
    job_id: args.jobId,
    scan_session_id: args.scanSessionId,
    video_url: args.signedVideoUrl,
    catalogue_type: args.catalogueType,
    callback_base_url: `${args.supabaseUrl}/functions/v1`,
    callback_secret: args.callbackSecret,
  }
}

export type HandoffJobUpdate =
  | { status: 'processing' }
  | { status: 'failed'; error: string }

/**
 * Pure status-transition logic for the handoff result: success dispatches the
 * job to `processing`; any dispatch failure marks it `failed` with the cause.
 * Unit-tested offline in videoHandoff.test.ts.
 */
export function decideHandoffJobUpdate(handoff: {
  ok: boolean
  status?: number
  body?: string
  error?: string
}): HandoffJobUpdate {
  if (handoff.ok) {
    return { status: 'processing' }
  }
  const cause =
    handoff.error ??
    `Modal handoff failed: ${handoff.status ?? '?'} ${handoff.body ?? ''}`.trim()
  return { status: 'failed', error: cause }
}
