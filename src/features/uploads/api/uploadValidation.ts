/**
 * Client-side upload validation.
 *
 * Catches invalid files before upload to avoid wasting bandwidth,
 * especially on mobile connections. Rules match the server-side storage
 * bucket configuration (migration 016).
 */

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

/**
 * Validate a file before upload.
 * @throws Error with user-friendly message if validation fails
 */
export function validateUploadFile(file: File): void {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type || 'unknown'}. Allowed: JPEG, PNG, WebP, GIF`)
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: 10MB`)
  }
}
