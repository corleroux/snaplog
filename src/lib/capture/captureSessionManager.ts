/**
 * Capture Session Manager
 *
 * Pure functions for managing capture session state.
 *
 * IMPORTANT: This does NOT handle persistence, extraction, or entity creation.
 * It only manages the in-memory state of the capture session.
 *
 * All functions are pure and return new state - no mutations.
 */

import type {
  CaptureSession,
  CaptureImage,
  ImageClassification,
  EntityType,
  AddImageResult,
  RemoveImageResult,
  SetClassificationResult,
  SessionValidation,
} from '@/types/capture'

/**
 * Generate a unique ID for a session or image
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a new empty capture session
 */
export function createSession(entityType: EntityType): CaptureSession {
  const now = new Date()
  return {
    id: generateId(),
    entityType,
    images: [],
    infoImageId: null,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Add an image to a capture session
 *
 * Rules:
 * - Multiple images allowed
 * - New images are classified as 'gallery' by default
 * - Returns updated session with new image
 */
export function addImage(
  session: CaptureSession,
  uri: string,
  classification: ImageClassification = 'gallery'
): AddImageResult {
  // If trying to add as Info, verify no other Info exists
  if (classification === 'info' && session.infoImageId !== null) {
    return {
      success: false,
      error: 'Cannot add Info image: another Info image already exists. Use setClassification to replace it.',
    }
  }

  const newImage: CaptureImage = {
    id: generateId(),
    uri,
    classification,
    addedAt: new Date(),
  }

  const updatedSession: CaptureSession = {
    ...session,
    images: [...session.images, newImage],
    infoImageId: classification === 'info' ? newImage.id : session.infoImageId,
    updatedAt: new Date(),
  }

  return {
    success: true,
    session: updatedSession,
  }
}

/**
 * Remove an image from a capture session
 *
 * Rules:
 * - Any image can be removed
 * - If Info image is removed, infoImageId is set to null
 */
export function removeImage(
  session: CaptureSession,
  imageId: string
): RemoveImageResult {
  const imageIndex = session.images.findIndex((img) => img.id === imageId)

  if (imageIndex === -1) {
    return {
      success: false,
      error: `Image with id ${imageId} not found in session`,
    }
  }

  const updatedImages = session.images.filter((img) => img.id !== imageId)
  const wasInfoImage = session.infoImageId === imageId

  const updatedSession: CaptureSession = {
    ...session,
    images: updatedImages,
    infoImageId: wasInfoImage ? null : session.infoImageId,
    updatedAt: new Date(),
  }

  return {
    success: true,
    session: updatedSession,
  }
}

/**
 * Change an image's classification
 *
 * Rules:
 * - Gallery → Info: Allowed, replaces current Info if exists
 * - Info → Gallery: Allowed
 * - Returns ID of previously Info image if replaced
 */
export function setClassification(
  session: CaptureSession,
  imageId: string,
  newClassification: ImageClassification
): SetClassificationResult {
  const image = session.images.find((img) => img.id === imageId)

  if (!image) {
    return {
      success: false,
      error: `Image with id ${imageId} not found in session`,
    }
  }

  // If setting to Info and another Info exists, replace it
  if (newClassification === 'info' && session.infoImageId !== null && session.infoImageId !== imageId) {
    const previousInfoId = session.infoImageId

    // Demote previous Info to Gallery
    const updatedImages = session.images.map((img) =>
      img.id === previousInfoId ? { ...img, classification: 'gallery' as const } : img
    )

    // Promote new image to Info
    const updatedImages2 = updatedImages.map((img) =>
      img.id === imageId ? { ...img, classification: 'info' as const } : img
    )

    const updatedSession: CaptureSession = {
      ...session,
      images: updatedImages2,
      infoImageId: imageId,
      updatedAt: new Date(),
    }

    return {
      success: true,
      session: updatedSession,
      previousInfoImageId: previousInfoId,
    }
  }

  // If setting to Gallery and this is the Info image
  if (newClassification === 'gallery' && session.infoImageId === imageId) {
    const updatedImages = session.images.map((img) =>
      img.id === imageId ? { ...img, classification: 'gallery' as const } : img
    )

    const updatedSession: CaptureSession = {
      ...session,
      images: updatedImages,
      infoImageId: null,
      updatedAt: new Date(),
    }

    return {
      success: true,
      session: updatedSession,
      previousInfoImageId: imageId,
    }
  }

  // Normal classification change (no Info conflicts)
  const updatedImages = session.images.map((img) =>
    img.id === imageId ? { ...img, classification: newClassification } : img
  )

  const updatedSession: CaptureSession = {
    ...session,
    images: updatedImages,
    infoImageId: newClassification === 'info' ? imageId : session.infoImageId,
    updatedAt: new Date(),
  }

  return {
    success: true,
    session: updatedSession,
  }
}

/**
 * Get the Info image from a session (if exists)
 */
export function getInfoImage(session: CaptureSession): CaptureImage | undefined {
  if (!session.infoImageId) return undefined
  return session.images.find((img) => img.id === session.infoImageId)
}

/**
 * Get all Gallery images from a session
 */
export function getGalleryImages(session: CaptureSession): CaptureImage[] {
  return session.images.filter((img) => img.classification === 'gallery')
}

/**
 * Check if a session has an Info image
 */
export function hasInfoImage(session: CaptureSession): boolean {
  return session.infoImageId !== null
}

/**
 * Check if a session can add another Info image
 */
export function canAddInfoImage(session: CaptureSession): boolean {
  return session.infoImageId === null
}

/**
 * Get image count by classification
 */
export function getImageCounts(session: CaptureSession): {
  total: number
  info: number
  gallery: number
} {
  return {
    total: session.images.length,
    info: session.infoImageId !== null ? 1 : 0,
    gallery: session.images.filter((img) => img.classification === 'gallery').length,
  }
}

/**
 * Validate a capture session before proceeding
 *
 * Rules:
 * - At least one image required
 * - At most one Info image (should always be true due to state management)
 */
export function validateSession(session: CaptureSession): SessionValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // At least one image required
  if (session.images.length === 0) {
    errors.push('At least one image is required')
  }

  // At most one Info image
  const infoCount = session.images.filter((img) => img.classification === 'info').length
  if (infoCount > 1) {
    errors.push(`Only one Info image allowed, found ${infoCount}`)
  }

  // Warning if no Info image (extraction won't be possible)
  if (session.images.length > 0 && !session.infoImageId) {
    warnings.push('No Info image selected. AI extraction will not be available.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Clear all images from a session (reset to empty)
 */
export function clearSession(session: CaptureSession): CaptureSession {
  return {
    ...session,
    images: [],
    infoImageId: null,
    updatedAt: new Date(),
  }
}
