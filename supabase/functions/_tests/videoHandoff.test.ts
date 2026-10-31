/**
 * Video Handoff Contract Tests (FR-VID)
 *
 * Unit-tests the edge → Modal handoff payload: the exact fields the Modal
 * webhook (modal/video_pipeline.py::process_video) expects. Runs offline with
 * no server — the full 202 path needs local Supabase + a Modal stub.
 *
 * Run with: deno test --allow-net --allow-env supabase/functions/_tests/videoHandoff.test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { buildHandoffPayload } from '../_shared/videoHandoff.ts'

Deno.test('videoHandoff: builds the exact Modal webhook contract', () => {
  const payload = buildHandoffPayload({
    jobId: 'job-123',
    scanSessionId: 'scan-456',
    signedVideoUrl: 'https://storage/video.mp4?token=abc',
    catalogueType: 'garment',
    supabaseUrl: 'https://xyz.supabase.co',
    callbackSecret: 'secret',
  })

  assertEquals(payload, {
    job_id: 'job-123',
    scan_session_id: 'scan-456',
    video_url: 'https://storage/video.mp4?token=abc',
    catalogue_type: 'garment',
    callback_base_url: 'https://xyz.supabase.co/functions/v1',
    callback_secret: 'secret',
  })
})
