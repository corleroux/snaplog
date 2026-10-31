/**
 * process-video-document
 *
 * Accepts a video capture of a rack, stand or display and hands it to the
 * Modal video pipeline. Returns immediately — video processing is async and
 * results are written back to Supabase by Modal (FR-VID-05).
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MAY read scan_sessions
 * - MAY create video_jobs rows
 * - MAY read video from storage (signed URL for Modal)
 * - MAY POST to the Modal video endpoint (shared secret)
 * - MUST return immediately after handing off (never block on video)
 * - MUST NOT perform extraction
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, internalError } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { validateUUID } from '../_shared/validation.ts'
import { validateEnv } from '../_shared/envValidation.ts'
import { createExtractAudit } from '../_shared/extractAudit.ts'
import { buildHandoffPayload, decideHandoffJobUpdate } from '../_shared/videoHandoff.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

// Validate environment at startup
const env = validateEnv()

const FUNCTION_NAME = 'process-video-document'
const log = createLogger(FUNCTION_NAME)
const audit = createExtractAudit(log)

interface ProcessVideoRequest {
  scan_session_id: string
  event_id: string
  vendor_id: string
  storage_path: string
  mime_type: string
  catalogue_type: string
}

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const methodError = requireMethod(req, 'POST')
  if (methodError) return methodError

  const auth = await requireUser(req)
  if (auth.response) return auth.response

  const { user, supabase } = auth
  const supabaseAdmin = createAdminClient()

  const modalEndpoint = Deno.env.get('MODAL_VIDEO_ENDPOINT_URL')
  const callbackSecret = Deno.env.get('VIDEO_CALLBACK_SECRET')
  if (!modalEndpoint || !callbackSecret) {
    return internalError(
      'Video pipeline is not configured (MODAL_VIDEO_ENDPOINT_URL / VIDEO_CALLBACK_SECRET)',
      'Video pipeline unavailable',
      req
    )
  }

  try {
    const body: ProcessVideoRequest = await req.json()
    const scanSessionId = body.scan_session_id
    audit.requestParsed({ scan_session_id: scanSessionId, scan_type: 'rack_video' })

    if (!scanSessionId) throw new Error('scan_session_id is required')
    if (!body.event_id) throw new Error('event_id is required')
    if (!body.vendor_id) throw new Error('vendor_id is required')
    if (!body.storage_path) throw new Error('storage_path is required')
    if (!body.catalogue_type) throw new Error('catalogue_type is required')

    validateUUID(scanSessionId, 'scan_session_id')
    validateUUID(body.event_id, 'event_id')
    validateUUID(body.vendor_id, 'vendor_id')

    // Verify the scan session belongs to the user and matches the event.
    const { data: scanSession, error: sessionError } = await supabase
      .from('scan_sessions')
      .select('id, event_id, vendor_id, created_by')
      .eq('id', scanSessionId)
      .single()

    if (sessionError || !scanSession) {
      return json({ error: 'Not found', message: 'Scan session not found' }, 404, req)
    }
    if (scanSession.created_by !== user.id) {
      return json({ error: 'Forbidden', message: 'You do not own this scan session' }, 403, req)
    }
    if (scanSession.event_id !== body.event_id) {
      return json({ error: 'Conflict', message: 'event_id does not match scan session' }, 409, req)
    }

    // Create the video job row (status queued).
    const { data: job, error: jobError } = await supabaseAdmin
      .from('video_jobs')
      .insert({
        scan_session_id: scanSessionId,
        event_id: body.event_id,
        vendor_id: body.vendor_id,
        status: 'queued',
        progress: 0,
        items_found: 0,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      throw new Error(`Failed to create video job: ${jobError?.message || 'Unknown error'}`)
    }

    // Signed URL so Modal can download the video without service credentials.
    const { data: signedData, error: signedError } = await supabaseAdmin
      .storage
      .from('scan-originals')
      .createSignedUrl(body.storage_path, 3600)

    if (signedError || !signedData?.signedUrl) {
      await supabaseAdmin.from('video_jobs').update({
        status: 'failed',
        error: `Failed to sign video URL: ${signedError?.message || 'Unknown error'}`,
      }).eq('id', job.id)
      throw new Error(`Failed to sign video URL: ${signedError?.message || 'Unknown error'}`)
    }

    // Hand off to Modal and return immediately — never block on video.
    // The webhook validates, spawns the worker, and returns fast; the heavy
    // processing happens after this POST resolves. Await only the dispatch.
    const handoffPayload = buildHandoffPayload({
      jobId: job.id,
      scanSessionId,
      signedVideoUrl: signedData.signedUrl,
      catalogueType: body.catalogue_type,
      supabaseUrl: Deno.env.get('SUPABASE_URL')!,
      callbackSecret,
    })

    // Fire-and-forget: the handoff result is recorded on the job row below.
    // MODAL_VIDEO_ENDPOINT_URL is the full deployed webhook URL
    // (https://<workspace>--snaplog-video-pipeline-process-video.modal.run).
    let handoffFailed: string | null = null
    try {
      const handoff = await fetch(modalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${callbackSecret}`,
        },
        body: JSON.stringify(handoffPayload),
      })
      const update = decideHandoffJobUpdate(
        handoff.ok
          ? { ok: true }
          : { ok: false, status: handoff.status, body: await handoff.text() }
      )
      if (update.status === 'failed') {
        handoffFailed = update.error
      }
    } catch (handoffError) {
      const update = decideHandoffJobUpdate({
        ok: false,
        error: handoffError instanceof Error ? handoffError.message : 'Unknown handoff error',
      })
      handoffFailed = update.status === 'failed' ? update.error : 'Unknown handoff error'
    }

    if (handoffFailed) {
      await supabaseAdmin.from('video_jobs').update({
        status: 'failed',
        error: handoffFailed,
      }).eq('id', job.id)
      throw new Error(handoffFailed)
    }

    await supabaseAdmin.from('video_jobs').update({
      status: 'processing',
    }).eq('id', job.id)

    audit.completed({ scan_session_id: scanSessionId })

    return json({ job_id: job.id, status: 'processing' }, 202, req)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    audit.failed({ error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })
    return internalError(errorMessage, 'Video handoff failed', req)
  }
})
