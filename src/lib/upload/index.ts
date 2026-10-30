/**
 * Upload Module Exports
 *
 * Central exports for all upload-related functionality.
 */

export {
  uploadCaptureImage,
  uploadCaptureImages,
  deleteCaptureImage,
  compressImage,
  type UploadImageResult,
  type UploadImageOptions,
  type CompressImageResult,
  type CompressionOptions,
} from './imageUpload'

export {
  validateImageFile,
  validateImageFiles,
  validateDataUri,
  extractImageMetadata,
  type ValidationResult,
  type ImageMetadata,
  type ValidationOptions,
} from './validateImage'

export {
  storagePathToPublicUrl,
  isSignedUrl,
} from './storageUrls'
