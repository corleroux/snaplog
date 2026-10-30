/**
 * Image File Content Validation
 *
 * Comprehensive validation for uploaded image files to ensure:
 * - File type is genuinely what it claims to be (magic number validation)
 * - File size is within acceptable limits
 * - Image dimensions are valid
 * - Content is not corrupted
 * - No embedded malicious content
 *
 * This prevents:
 * - File type spoofing (e.g., renaming .exe to .jpg)
 * - Storage exhaustion attacks
 * - Processing of corrupted/invalid images
 * - Basic content-based attacks
 */

import { createLogger } from '@/lib/logger'

const logger = createLogger('ImageValidation')

/**
 * Validation result.
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean
  /** Error message if validation failed */
  error?: string
  /** Warnings (non-critical issues) */
  warnings?: string[]
}

/**
 * Image metadata extracted from file.
 */
export interface ImageMetadata {
  /** MIME type */
  mimeType: string
  /** File size in bytes */
  fileSize: number
  /** Width in pixels */
  width: number
  /** Height in pixels */
  height: number
  /** Whether image has alpha channel */
  hasAlpha: boolean
  /** Image format details */
  format?: string
}

/**
 * Validation options.
 */
export interface ValidationOptions {
  /** Maximum file size in bytes. Default: 10MB */
  maxSize?: number
  /** Minimum width in pixels. Default: 100 */
  minWidth?: number
  /** Maximum width in pixels. Default: 4096 */
  maxWidth?: number
  /** Minimum height in pixels. Default: 100 */
  minHeight?: number
  /** Maximum height in pixels. Default: 4096 */
  maxHeight?: number
  /** Allowed MIME types. Default: common image types */
  allowedTypes?: string[]
  /** Whether to check for embedded scripts (basic check). Default: true */
  checkScripts?: boolean
}

/**
 * Default validation limits.
 */
const DEFAULT_VALIDATION: Required<Omit<ValidationOptions, 'checkScripts'>> & { checkScripts: boolean } = {
  maxSize: 10 * 1024 * 1024, // 10MB
  minWidth: 100,
  maxWidth: 4096,
  minHeight: 100,
  maxHeight: 4096,
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  checkScripts: true,
}

/**
 * Magic numbers (file signatures) for common image types.
 * Used to detect file type spoofing.
 */
const MAGIC_NUMBERS: Record<string, Uint8Array> = {
  'image/jpeg': new Uint8Array([0xFF, 0xD8, 0xFF]),
  'image/png': new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  'image/webp': new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF
  'image/gif': new Uint8Array([0x47, 0x49, 0x46, 0x38]), // GIF8
}

/**
 * Validate file type by checking magic numbers (file signature).
 *
 * This prevents file type spoofing where a malicious file is renamed
 * to have an image extension.
 *
 * @param file - File to validate
 * @param expectedMimeType - Expected MIME type from extension
 * @returns True if magic number matches expected type
 */
async function validateMagicNumber(file: File | Blob, expectedMimeType: string): Promise<boolean> {
  const expectedMagic = MAGIC_NUMBERS[expectedMimeType]
  if (!expectedMagic) {
    // Unknown type - allow but log warning
    logger.warn('Unknown MIME type for magic number validation', { mimeType: expectedMimeType })
    return true
  }

  // Read first bytes of file
  const arrayBuffer = await file.slice(0, expectedMagic.length).arrayBuffer()
  const fileHeader = new Uint8Array(arrayBuffer)

  // Compare with expected magic number
  for (let i = 0; i < expectedMagic.length; i++) {
    if (fileHeader[i] !== expectedMagic[i]) {
      return false
    }
  }

  return true
}

/**
 * Extract image metadata from a file.
 *
 * @param file - Image file
 * @returns Image metadata
 * @throws Error if image cannot be loaded
 */
export async function extractImageMetadata(file: File | Blob): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Create canvas to check for alpha channel
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, 1, 1)
      const hasAlpha = imageData.data[3] < 255

      resolve({
        mimeType: file.type || 'image/jpeg',
        fileSize: file.size,
        width: img.naturalWidth,
        height: img.naturalHeight,
        hasAlpha,
        format: img.src.split('.').pop()?.split('?')[0],
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image - file may be corrupted'))
    }

    img.src = url
  })
}

/**
 * Validate an image file before upload.
 *
 * Performs comprehensive validation including:
 * - File size limits
 * - MIME type allowlist
 * - Magic number verification (prevents spoofing)
 * - Dimension limits
 * - Basic content integrity check
 *
 * @param file - File to validate
 * @param options - Validation options
 * @returns Validation result with metadata if valid
 */
export async function validateImageFile(
  file: File,
  options: ValidationOptions = {}
): Promise<ValidationResult & { metadata?: ImageMetadata }> {
  const opts = { ...DEFAULT_VALIDATION, ...options }
  const warnings: string[] = []

  // 1. Check file size
  if (file.size > opts.maxSize) {
    const maxSizeMB = (opts.maxSize / (1024 * 1024)).toFixed(1)
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File size (${fileSizeMB}MB) exceeds maximum (${maxSizeMB}MB)`,
    }
  }

  // 2. Check MIME type allowlist
  if (!opts.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type '${file.type}' is not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`,
    }
  }

  // 3. Validate magic number (detect spoofing)
  try {
    const magicValid = await validateMagicNumber(file, file.type)
    if (!magicValid) {
      logger.warn('Magic number mismatch - possible file type spoofing', {
        claimedType: file.type,
        fileSize: file.size,
      })
      return {
        valid: false,
        error: `File content does not match declared type '${file.type}'. File may be corrupted or renamed.`,
      }
    }
  } catch (err) {
    logger.error('Magic number validation failed', { error: String(err) })
    // Don't fail on magic number validation error, but log it
    warnings.push('Could not verify file type signature')
  }

  // 4. Extract and validate metadata (also checks if image can be loaded)
  let metadata: ImageMetadata
  try {
    metadata = await extractImageMetadata(file)
  } catch (err) {
    return {
      valid: false,
      error: `Failed to load image: ${(err as Error).message}. File may be corrupted.`,
    }
  }

  // 5. Validate dimensions
  if (metadata.width < opts.minWidth || metadata.height < opts.minHeight) {
    return {
      valid: false,
      error: `Image too small. Minimum: ${opts.minWidth}x${opts.minHeight}, got: ${metadata.width}x${metadata.height}`,
    }
  }

  if (metadata.width > opts.maxWidth || metadata.height > opts.maxHeight) {
    return {
      valid: false,
      error: `Image too large. Maximum: ${opts.maxWidth}x${opts.maxHeight}, got: ${metadata.width}x${metadata.height}`,
    }
  }

  // 6. Warn on large dimensions (may cause performance issues)
  if (metadata.width > 2048 || metadata.height > 2048) {
    warnings.push(`Large image (${metadata.width}x${metadata.height}) - will be compressed during upload`)
  }

  // 7. Warn on alpha channel for JPEG (will be lost)
  if (metadata.hasAlpha && file.type === 'image/jpeg') {
    warnings.push('JPEG does not support transparency - alpha channel will be lost')
  }

  // 8. Basic script/content check (for "polyglot" files)
  if (opts.checkScripts) {
    try {
      const scriptCheck = await checkForEmbeddedScripts(file)
      if (scriptCheck.hasScripts) {
        logger.warn('Embedded script detected in image', {
          fileName: file.name,
          mimeType: file.type,
        })
        return {
          valid: false,
          error: 'File contains embedded scripts or executable content. This may indicate a malicious file.',
        }
      }
    } catch (err) {
      logger.error('Script check failed', { error: String(err) })
      warnings.push('Could not complete security scan')
    }
  }

  return {
    valid: true,
    metadata,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Check for embedded scripts in image file.
 *
 * This is a basic check for common polyglot attack patterns
 * where executable code is embedded in image files.
 *
 * @param file - File to check
 * @returns Whether scripts were detected
 */
async function checkForEmbeddedScripts(file: File | Blob): Promise<{ hasScripts: boolean }> {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)

  // Convert to text for basic pattern matching
  // Only check first and last 4KB to avoid scanning entire file
  const scanSize = Math.min(4096, bytes.length)

  // Check beginning of file
  const startBytes = bytes.slice(0, scanSize)
  const startText = new TextDecoder('utf-8', { fatal: false }).decode(startBytes).toLowerCase()

  // Check end of file
  const endBytes = bytes.slice(-scanSize)
  const endText = new TextDecoder('utf-8', { fatal: false }).decode(endBytes).toLowerCase()

  // Suspicious patterns that shouldn't be in legitimate images
  const suspiciousPatterns = [
    '<script',
    'javascript:',
    'eval(',
    'document.write',
    'fromCharCode',
    '&#',
    '<iframe',
    'onload=',
    'onerror=',
  ]

  for (const pattern of suspiciousPatterns) {
    if (startText.includes(pattern) || endText.includes(pattern)) {
      return { hasScripts: true }
    }
  }

  return { hasScripts: false }
}

/**
 * Validate multiple image files.
 *
 * @param files - Files to validate
 * @param options - Validation options
 * @returns Array of validation results
 */
export async function validateImageFiles(
  files: File[],
  options: ValidationOptions = {}
): Promise<Array<ValidationResult & { metadata?: ImageMetadata; fileName?: string }>> {
  return Promise.all(
    files.map(async (file) => {
      const result = await validateImageFile(file, options)
      return { ...result, fileName: file.name }
    })
  )
}

/**
 * Validate a base64 data URI as an image.
 *
 * @param dataUri - Base64 data URI (e.g., "data:image/jpeg;base64,...")
 * @param options - Validation options
 * @returns Validation result
 */
export async function validateDataUri(
  dataUri: string,
  options: ValidationOptions = {}
): Promise<ValidationResult & { metadata?: ImageMetadata }> {
  // Validate data URI format
  if (!dataUri.startsWith('data:image/')) {
    return {
      valid: false,
      error: 'Invalid data URI - must start with "data:image/"',
    }
  }

  // Extract MIME type
  const match = dataUri.match(/^data:([^;]+);base64,/)
  if (!match) {
    return {
      valid: false,
      error: 'Invalid data URI format',
    }
  }

  const mimeType = match[1]

  // Extract base64 data
  const base64Data = dataUri.split(',')[1]
  if (!base64Data) {
    return {
      valid: false,
      error: 'No data found in data URI',
    }
  }

  // Convert to Blob
  const byteString = atob(base64Data)
  const bytes = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; i++) {
    bytes[i] = byteString.charCodeAt(i)
  }

  const blob = new Blob([bytes], { type: mimeType })
  const file = new File([blob], 'image', { type: mimeType })

  return validateImageFile(file, options)
}
