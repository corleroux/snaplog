/**
 * Upload fabric/style source images to Supabase Storage.
 *
 * Uploads the original captured images to the scan-originals bucket
 * for use in AI extraction and audit trail.
 */

import { supabase } from '@/lib/supabase/client'
import { validateUploadFile } from './uploadValidation'

export interface UploadStyleSourceImagesParams {
  eventId: string
  vendorId: string
  files: File[]
  draftId: string
}

export interface UploadStyleSourceImagesResult {
  paths: string[]
  signedUrls: Array<string | null>
}

const BUCKET_NAME = 'scan-originals'

/**
 * Upload fabric/style source images to Supabase Storage.
 *
 * The images are stored at: scan-originals/{eventId}/styles/{draftId}/{index}.{ext}
 *
 * @param params - Upload parameters including eventId, vendorId, files, and draftId
 * @returns Storage paths and public URLs for each uploaded image
 * @throws Error if any upload fails
 */
export async function uploadStyleSourceImages({
  eventId,
  vendorId,
  files,
  draftId,
}: UploadStyleSourceImagesParams): Promise<UploadStyleSourceImagesResult> {
  const paths: string[] = []
  const signedUrls: Array<string | null> = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]

    // Validate before upload to avoid wasting bandwidth
    validateUploadFile(file)

    const fileExt = file.name.split('.').pop() ?? 'jpg'
    const path = `${eventId}/styles/${vendorId}/${draftId}/${i}.${fileExt}`

    // Upload the file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      // Clean up previously uploaded files on failure
      if (paths.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(paths)
      }
      throw new Error(`Failed to upload image ${i + 1}: ${error.message}`)
    }

    paths.push(data.path)

    // Generate signed URL (bucket is private, so public URLs won't work)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(data.path, 60)

    if (signedUrlError || !signedUrlData) {
      // Clean up previously uploaded files on failure
      if (paths.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(paths)
      }
      throw new Error(`Failed to generate signed URL for image ${i + 1}: ${signedUrlError?.message ?? 'Unknown error'}`)
    }

    signedUrls.push(signedUrlData.signedUrl)
  }

  return {
    paths,
    signedUrls,
  }
}

/**
 * Delete previously uploaded source images.
 *
 * @param paths - The storage paths of the images to delete
 */
export async function deleteStyleSourceImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths)

  if (error) {
    throw new Error(`Failed to delete images: ${error.message}`)
  }
}
