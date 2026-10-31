/**
 * Video processing adapter (FR-VID).
 *
 * Client side of the async video flow:
 * 1. Create a `rack_video` scan session.
 * 2. Upload the video to storage.
 * 3. Invoke `process-video-document` (returns immediately with a job id).
 * 4. Poll `video_jobs` until the job completes or fails.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import { createScanSession } from '@/features/scans/api/createScanSession'
import { uploadVideo, validateVideoFile } from '@/lib/upload/videoUpload'

const logger = createLogger('VideoProcess')

export type VideoJobStatus = 'queued' | 'processing' | 'complete' | 'failed'

export interface VideoJob {
  id: string
  status: VideoJobStatus
  progress: number
  items_found: number
  error: string | null
}

export interface StartVideoJobParams {
  eventId: string
  vendorId: string
  file: File
  catalogueType?: string
}

/**
 * Start async video processing for a rack-walk capture.
 * Returns the video job id; the edge function never blocks.
 */
export async function startVideoJob({
  eventId,
  vendorId,
  file,
  catalogueType = 'garment',
}: StartVideoJobParams): Promise<{ jobId: string; scanSessionId: string }> {
  const validation = validateVideoFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const scanSession = await createScanSession({
    eventId,
    scanType: 'rack_video',
    vendorId,
  })

  const storagePath = await uploadVideo(file, eventId)

  await supabase
    .from('scan_sessions')
    .update({ source_image_path: storagePath })
    .eq('id', scanSession.id)

  const { data, error } = await supabase.functions.invoke<{ job_id: string; status: string }>(
    'process-video-document',
    {
      body: {
        scan_session_id: scanSession.id,
        event_id: eventId,
        vendor_id: vendorId,
        storage_path: storagePath,
        mime_type: file.type,
        catalogue_type: catalogueType,
      },
    }
  )

  if (error) {
    logger.error('Process video function error', { error: String(error) })
    throw new Error(error.message || 'Video processing failed to start')
  }

  if (!data?.job_id) {
    throw new Error('No job id returned from video processing')
  }

  return { jobId: data.job_id, scanSessionId: scanSession.id }
}

/**
 * Fetch the current status of a video job.
 */
export async function getVideoJobStatus(jobId: string): Promise<VideoJob> {
  const { data, error } = await supabase
    .from('video_jobs')
    .select('id, status, progress, items_found, error')
    .eq('id', jobId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to fetch video job: ${error?.message || 'not found'}`)
  }

  return data as VideoJob
}

/**
 * Poll a video job until it completes or fails (or attempts run out).
 * Resolves with the final job row; rejects on failure or timeout.
 */
export async function pollVideoJob(
  jobId: string,
  { intervalMs = 5000, maxAttempts = 72 }: { intervalMs?: number; maxAttempts?: number } = {}
): Promise<VideoJob> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const job = await getVideoJobStatus(jobId)

    if (job.status === 'complete') {
      return job
    }
    if (job.status === 'failed') {
      throw new Error(job.error || 'Video processing failed')
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Timed out waiting for video processing')
}
