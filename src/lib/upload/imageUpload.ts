/**
 * Image Upload Utility
 *
 * Handles uploading captured images to Supabase storage for extraction.
 *
 * Images are uploaded to the scan-originals bucket with a unique path
 * that includes the event ID and timestamp.
 *
 * Images are optimized (compressed to WebP) before upload to reduce
 * storage/bandwidth and improve AI processing performance.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('ImageUpload')

const STORAGE_BUCKET = 'scan-originals'

/**
 * Image compression options.
 */
export interface CompressionOptions {
  /** Target quality (0-1). Default: 0.35 (35% quality) */
  quality?: number
  /** Maximum width in pixels. Default: 1024 */
  maxWidth?: number
  /** Maximum height in pixels. Default: 1024 */
  maxHeight?: number
  /** Output format. Default: 'image/webp' */
  outputFormat?: 'image/jpeg' | 'image/png' | 'image/webp'
}

/**
 * Default compression settings.
 */
const DEFAULT_COMPRESSION: CompressionOptions = {
  quality: 0.35, // 35% quality — aggressive for low-bandwidth trade fair networks
  maxWidth: 1024,
  maxHeight: 1024,
  outputFormat: 'image/webp',
}

/**
 * Compression result.
 */
export interface CompressImageResult {
  /** Compressed blob */
  blob: Blob
  /** Original size in bytes */
  originalSize: number
  /** Compressed size in bytes */
  compressedSize: number
  /** Compression ratio (0-1) */
  compressionRatio: number
  /** Output MIME type */
  mimeType: string
}

/**
 * Convert canvas to blob with the given format and quality.
 * Returns the blob with its actual MIME type (which may differ from requested).
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas toBlob conversion failed'))
        }
      },
      type,
      quality
    )
  })
}

/**
 * Compress an image using Canvas API.
 *
 * ALL images are converted through the canvas pipeline to ensure:
 * - Consistent WebP output format (no HEIC passthrough)
 * - Correct MIME type matching actual binary data (fixes iOS Safari toBlob)
 * - Reduced file size for low-bandwidth networks
 *
 * @param file - Original image file
 * @param options - Compression options
 * @returns Compressed image result
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressImageResult> {
  const {
    quality = DEFAULT_COMPRESSION.quality,
    maxWidth = DEFAULT_COMPRESSION.maxWidth,
    maxHeight = DEFAULT_COMPRESSION.maxHeight,
    outputFormat = DEFAULT_COMPRESSION.outputFormat,
  } = options

  const originalSize = file.size

  // Load image into Canvas — all images go through this path
  // to guarantee format conversion (e.g. HEIC → WebP on iOS)
  const bitmap = await createImageBitmap(file)

  // Calculate scaled dimensions (maintain aspect ratio)
  let { width, height } = bitmap
  const scale = Math.min(
    (maxWidth || 2048) / width,
    (maxHeight || 2048) / height,
    1
  )

  if (scale < 1) {
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  // Draw to canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas context not available')
  }

  ctx.drawImage(bitmap, 0, 0, width, height)

  // Convert to blob with compression
  const format: string = outputFormat ?? 'image/webp'
  const q: number = quality ?? DEFAULT_COMPRESSION.quality ?? 0.5
  let blob = await canvasToBlob(canvas, format, q)
  let mimeType = blob.type || outputFormat || 'image/webp'

  // iOS Safari's toBlob silently falls back to PNG when WebP encoding
  // isn't supported. PNG ignores the quality parameter, producing
  // uncompressed output (e.g. 5.4MB instead of ~200KB).
  // Retry with JPEG — universally supported and respects quality.
  if (mimeType === 'image/png' && format === 'image/webp') {
    logger.warn('WebP encoding not supported, falling back to JPEG', {
      originalSize: formatSize(originalSize),
      pngSize: formatSize(blob.size),
    })
    blob = await canvasToBlob(canvas, 'image/jpeg', q)
    mimeType = blob.type || 'image/jpeg'
  }

  const compressedSize = blob.size
  const compressionRatio = compressedSize / originalSize

  return {
    blob,
    originalSize,
    compressedSize,
    compressionRatio,
    mimeType,
  }
}

export interface UploadImageResult {
  /** Storage path (for extraction functions) */
  storagePath: string
  /** Signed URL (time-limited, for immediate display during capture) */
  signedUrl: string
  /** Permanent public URL (for database persistence — never expires) */
  publicUrl: string
  /** MIME type */
  mimeType: string
}

export interface UploadImageOptions {
  /** Event ID for path organization */
  eventId: string
  /** Optional vendor ID (for style images) */
  vendorId?: string
  /** Optional custom filename (otherwise generated) */
  filename?: string
  /** Compression options (defaults to WebP 35% quality) */
  compression?: CompressionOptions
  /** Skip compression (for debugging/testing) */
  skipCompression?: boolean
}

/**
 * Upload a captured image to Supabase storage.
 *
 * Images are automatically compressed to WebP (default 35% quality) before
 * upload to reduce storage/bandwidth and improve extraction performance.
 *
 * @param fileUri - Local file URI (file://, capacitor://, etc.) or base64 data URI
 * @param options - Upload options
 * @returns Upload result with storage path and signed URL
 * @throws Error if upload fails
 */
export async function uploadCaptureImage(
  fileUri: string,
  options: UploadImageOptions
): Promise<UploadImageResult> {
  const { eventId, vendorId, filename, compression, skipCompression = false } = options

  // Determine MIME type from URI or default to JPEG
  let mimeType = 'image/jpeg'
  if (fileUri.startsWith('data:')) {
    const match = fileUri.match(/^data:([^;]+);/)
    if (match) mimeType = match[1]
  } else {
    const ext = fileUri.split('.').pop()?.toLowerCase()
    if (ext === 'png') mimeType = 'image/png'
    else if (ext === 'webp') mimeType = 'image/webp'
    else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
  }

  // Convert file URI to Blob
  let blob = await fileUriToBlob(fileUri, mimeType)

  // Compress image unless explicitly skipped
  if (!skipCompression) {
    const originalFile = new File([blob], 'image', { type: mimeType })
    const compressionResult = await compressImage(originalFile, compression)
    blob = compressionResult.blob
    mimeType = compressionResult.mimeType

    // Log compression for debugging
    logger.debug('Image compression', {
      original: formatSize(compressionResult.originalSize),
      compressed: formatSize(compressionResult.compressedSize),
      ratio: `${Math.round(compressionResult.compressionRatio * 100)}%`,
    })
  }

  // Generate unique storage path
  const timestamp = Date.now()
  const uniqueId = crypto.randomUUID()
  const safeFilename = filename || `capture-${timestamp}-${uniqueId}.${mimeType.split('/')[1]}`
  const storagePath = vendorId
    ? `${eventId}/${vendorId}/${safeFilename}`
    : `${eventId}/${safeFilename}`

  // Upload to Supabase storage
  const { data: _data, error } = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, blob, {
      contentType: mimeType,
      upsert: false, // Don't overwrite existing files
    })

  if (error) {
    logger.error('Image upload error', { error: String(error) })
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  // Generate signed URL for immediate display during capture
  const { data: signedUrlData, error: signedUrlError } = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 60)

  if (signedUrlError || !signedUrlData) {
    logger.error('Signed URL generation error', { error: String(signedUrlError) })
    throw new Error(`Failed to generate signed URL: ${signedUrlError?.message ?? 'Unknown error'}`)
  }

  // Generate permanent public URL for database persistence
  // The bucket has public read RLS, so this URL never expires
  const { data: publicUrlData } = supabase
    .storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath)

  return {
    storagePath,
    signedUrl: signedUrlData.signedUrl,
    publicUrl: publicUrlData.publicUrl,
    mimeType,
  }
}

/**
 * Upload multiple images in parallel.
 *
 * @param fileUris - Array of file URIs
 * @param options - Upload options (same for all images)
 * @returns Array of upload results
 */
export async function uploadCaptureImages(
  fileUris: string[],
  options: UploadImageOptions
): Promise<UploadImageResult[]> {
  return Promise.all(
    fileUris.map(uri => uploadCaptureImage(uri, options))
  )
}

/**
 * Convert a file URI to a Blob.
 *
 * Handles:
 * - Base64 data URIs (data:image/...;base64,...)
 * - File URIs (file://...)
 * - Capacitor file URIs (capacitor://...)
 *
 * @param fileUri - File URI or data URI
 * @param mimeType - Expected MIME type
 * @returns Blob
 */
async function fileUriToBlob(fileUri: string, mimeType: string): Promise<Blob> {
  // Handle base64 data URIs
  if (fileUri.startsWith('data:')) {
    const base64Data = fileUri.split(',')[1]
    const byteString = atob(base64Data)
    const bytes = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i)
    }
    return new Blob([bytes], { type: mimeType })
  }

  // Handle file:// URIs (browser context)
  if (fileUri.startsWith('file://')) {
    const response = await fetch(fileUri)
    return response.blob()
  }

  // Handle capacitor:// URIs (Capacitor context)
  if (fileUri.startsWith('capacitor://')) {
    // In Capacitor, we'd use Filesystem API
    // For now, try fetch as fallback
    try {
      const response = await fetch(fileUri)
      return response.blob()
    } catch (err) {
      throw new Error(`Capacitor file URIs not yet supported: ${fileUri}. Please use Capacitor Filesystem API.`)
    }
  }

  // Default: try fetch
  const response = await fetch(fileUri)
  return response.blob()
}

/**
 * Delete an uploaded image from storage.
 *
 * @param storagePath - Storage path of image to delete
 */
export async function deleteCaptureImage(storagePath: string): Promise<void> {
  const { error } = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .remove([storagePath])

  if (error) {
    logger.error('Image deletion error', { error: String(error) })
    // Don't throw - deletion failures are non-critical
  }
}

/**
 * Format file size in human-readable format.
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
