/**
 * React hook for managing capture session state
 *
 * This hook provides a convenient interface for components to interact
 * with capture session state.
 *
 * IMPORTANT: This does NOT handle persistence, extraction, or entity creation.
 * It only manages the in-memory state of the capture session.
 */

import { useState, useCallback } from 'react'
import { createLogger } from '@/lib/logger'
import type {
  CaptureSession,
  CaptureImage,
  EntityType,
  ImageClassification,
  SessionValidation,
} from '@/types/capture'
import {
  createSession,
  addImage,
  removeImage,
  setClassification,
  getInfoImage,
  getGalleryImages,
  hasInfoImage,
  canAddInfoImage,
  getImageCounts,
  validateSession,
  clearSession as clearSessionImages,
} from '@/lib/capture/captureSessionManager'

const logger = createLogger('CaptureSession')

export interface UseCaptureSessionReturn {
  /** Current session (null if no active session) */
  session: CaptureSession | null
  /** Whether a session is currently active */
  isActive: boolean
  /** Create a new capture session */
  startSession: (entityType: EntityType) => void
  /** End the current session (discard it) */
  endSession: () => void
  /** Add an image to the session */
  addCaptureImage: (uri: string, classification?: ImageClassification) => boolean
  /** Remove an image from the session */
  removeCaptureImage: (imageId: string) => boolean
  /** Change an image's classification */
  setImageClassification: (imageId: string, classification: ImageClassification) => boolean
  /** Get the Info image */
  getInfoImage: () => CaptureImage | undefined
  /** Get all Gallery images */
  getGalleryImages: () => CaptureImage[]
  /** Check if session has an Info image */
  hasInfoImage: () => boolean
  /** Check if session can add another Info image */
  canAddInfoImage: () => boolean
  /** Get image counts */
  getImageCounts: () => { total: number; info: number; gallery: number }
  /** Clear all images from session */
  clearImages: () => void
  /** Validate the session */
  validate: () => SessionValidation
}

/**
 * Hook for managing capture session state
 *
 * @example
 * ```tsx
 * const { session, addCaptureImage, setImageClassification } = useCaptureSession()
 *
 * // Start a new session for capturing a vendor
 * startSession('vendor')
 *
 * // Add images
 * addCaptureImage('file://photo1.jpg', 'gallery')
 * addCaptureImage('file://photo2.jpg', 'info')
 *
 * // Change classification
 * setImageClassification('photo1-id', 'info') // Replaces photo2 as Info
 * ```
 */
export function useCaptureSession(): UseCaptureSessionReturn {
  const [session, setSession] = useState<CaptureSession | null>(null)

  // Create a new session
  const startSession = useCallback((entityType: EntityType) => {
    setSession(createSession(entityType))
  }, [])

  // End the current session (discard)
  const endSession = useCallback(() => {
    setSession(null)
  }, [])

  // Add an image to the session
  const addCaptureImage = useCallback((uri: string, classification: ImageClassification = 'gallery') => {
    if (!session) {
      logger.warn('Cannot add image: no active session')
      return false
    }

    const result = addImage(session, uri, classification)
    if (result.success && result.session) {
      setSession(result.session)
      return true
    }

    logger.warn('Failed to add image', { error: result.error })
    return false
  }, [session])

  // Remove an image from the session
  const removeCaptureImage = useCallback((imageId: string) => {
    if (!session) {
      logger.warn('Cannot remove image: no active session')
      return false
    }

    const result = removeImage(session, imageId)
    if (result.success && result.session) {
      setSession(result.session)
      return true
    }

    logger.warn('Failed to remove image', { error: result.error })
    return false
  }, [session])

  // Change an image's classification
  const setImageClassification = useCallback((imageId: string, newClassification: ImageClassification) => {
    if (!session) {
      logger.warn('Cannot set classification: no active session')
      return false
    }

    const result = setClassification(session, imageId, newClassification)
    if (result.success && result.session) {
      setSession(result.session)
      return true
    }

    logger.warn('Failed to set classification', { error: result.error })
    return false
  }, [session])

  // Get the Info image
  const getInfo = useCallback(() => {
    if (!session) return undefined
    return getInfoImage(session)
  }, [session])

  // Get all Gallery images
  const getGallery = useCallback(() => {
    if (!session) return []
    return getGalleryImages(session)
  }, [session])

  // Check if session has an Info image
  const hasInfo = useCallback(() => {
    if (!session) return false
    return hasInfoImage(session)
  }, [session])

  // Check if session can add another Info image
  const canAddInfo = useCallback(() => {
    if (!session) return false
    return canAddInfoImage(session)
  }, [session])

  // Get image counts
  const getCounts = useCallback(() => {
    if (!session) return { total: 0, info: 0, gallery: 0 }
    return getImageCounts(session)
  }, [session])

  // Clear all images from session
  const clearImages = useCallback(() => {
    if (!session) return
    setSession(clearSessionImages(session))
  }, [session])

  // Validate the session
  const validate = useCallback((): SessionValidation => {
    if (!session) {
      return {
        valid: false,
        errors: ['No active session'],
        warnings: [],
      }
    }
    return validateSession(session)
  }, [session])

  return {
    session,
    isActive: session !== null,
    startSession,
    endSession,
    addCaptureImage,
    removeCaptureImage,
    setImageClassification,
    getInfoImage: getInfo,
    getGalleryImages: getGallery,
    hasInfoImage: hasInfo,
    canAddInfoImage: canAddInfo,
    getImageCounts: getCounts,
    clearImages,
    validate,
  }
}
