/**
 * Video Upload Utility (FR-VID)
 *
 * Handles uploading rack-walk video captures to Supabase storage for the
 * async video pipeline. Unlike photos, videos are uploaded as-is (no
 * client-side compression) — Modal downloads the original for SAM 3.1.
 *
 * Videos are uploaded to the scan-originals bucket under `rack-videos/`.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('VideoUpload')

const STORAGE_BUCKET = 'scan-originals'

/** Accepted video containers (match SAM 3.1 input_video support). */
const ACCEPTED_MIME_TYPES = ['video/mp4', 'video/quicktime'] as const

/** Maximum video size: 200 MB (covers ~60 s phone clips). */
export const MAX_VIDEO_SIZE_BYTES = 200 * 1024 * 1024

export interface ValidateVideoResult {
  valid: boolean
  error?: string
}

/**
 * Validate a video file before upload (type + size cap).
 * Pure — safe to unit-test without Supabase.
 */
export function validateVideoFile(file: File): ValidateVideoResult {
  if (!ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: `Unsupported video format (${file.type || 'unknown'}). Use MP4 or MOV.`,
    }
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return {
      valid: false,
      error: `Video is too large (${Math.round(file.size / 1024 / 1024)} MB). Maximum is ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024} MB.`,
    }
  }

  if (file.size === 0) {
    return { valid: false, error: 'Video file is empty.' }
  }

  return { valid: true }
}

/**
 * Upload a validated video file to storage.
 *
 * @param file - MP4/MOV file (validate first with validateVideoFile)
 * @param eventId - Event the video belongs to (used in the storage path)
 * @returns The storage path for the uploaded video
 */
export async function uploadVideo(file: File, eventId: string): Promise<string> {
  const validation = validateVideoFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const ext = file.type === 'video/quicktime' ? 'mov' : 'mp4'
  const storagePath = `rack-videos/${eventId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    logger.error('Video upload failed', { error: error.message })
    throw new Error(`Video upload failed: ${error.message}`)
  }

  return storagePath
}
