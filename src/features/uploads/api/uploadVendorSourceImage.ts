/**
 * Upload vendor source image to Supabase Storage.
 *
 * Uploads the original captured image to the scan-originals bucket
 * for use in AI extraction and audit trail.
 */

import { supabase } from '@/lib/supabase/client'
import { validateUploadFile } from './uploadValidation'

export interface UploadVendorSourceImageParams {
  eventId: string
  file: File
  draftId: string
}

export interface UploadVendorSourceImageResult {
  path: string
  signedUrl: string | null
}

const BUCKET_NAME = 'scan-originals'

/**
 * Upload a vendor source image to Supabase Storage.
 *
 * The image is stored at: scan-originals/{eventId}/{scanSessionId}/original.{ext}
 *
 * @param params - Upload parameters including eventId and file
 * @returns Storage path and signed URL
 * @throws Error if upload fails
 */
export async function uploadVendorSourceImage({
  eventId,
  file,
  draftId,
}: UploadVendorSourceImageParams): Promise<UploadVendorSourceImageResult> {
  // Validate before upload to avoid wasting bandwidth
  validateUploadFile(file)

  // Generate a unique path for this upload
  const fileExt = file.name.split('.').pop() ?? 'jpg'
  const path = `${eventId}/vendor/${draftId}/original.${fileExt}`

  // Upload the file
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Generate signed URL (bucket is private, so public URLs won't work)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(data.path, 60)

  if (signedUrlError || !signedUrlData) {
    throw new Error(`Failed to generate signed URL: ${signedUrlError?.message ?? 'Unknown error'}`)
  }

  return {
    path: data.path,
    signedUrl: signedUrlData.signedUrl,
  }
}

/**
 * Delete a previously uploaded source image.
 *
 * @param path - The storage path of the image to delete
 */
export async function deleteVendorSourceImage(path: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`)
  }
}
