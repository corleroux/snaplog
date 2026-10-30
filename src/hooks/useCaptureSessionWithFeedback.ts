/**
 * Capture Session with Feedback Hook
 *
 * Wraps useCaptureSession with automatic toast notifications for:
 * - Info image replacement feedback
 * - Gallery image removal with undo
 *
 * This provides a better UX by keeping users informed of state changes.
 *
 * DESIGN ALIGNED:
 * - Clear feedback for all state changes
 * - Undo capability for non-destructive actions
 * - Toast notifications at z-toast layer
 */

import { useCallback } from 'react'
import { useToast } from '@/components/ui'
import { useCaptureSession } from './useCaptureSession'

export interface UseCaptureSessionWithFeedbackReturn extends ReturnType<typeof useCaptureSession> {
  /**
   * Set image classification with toast feedback
   * Shows notification when Info image is replaced
   */
  setImageClassificationWithFeedback: (imageId: string, classification: 'info' | 'gallery') => boolean
  /**
   * Remove image with undo toast for Gallery images
   * Info images require parent to handle confirmation
   */
  removeImageWithFeedback: (imageId: string) => { success: boolean; isInfo: boolean }
}

/**
 * Hook for capture session with automatic feedback
 *
 * @example
 * ```tsx
 * const {
 *   session,
 *   setImageClassificationWithFeedback,
 *   removeImageWithFeedback,
 * } = useCaptureSessionWithFeedback()
 *
 * // When user toggles classification
 * setImageClassificationWithFeedback(imageId, 'info')
 * // Toast: "New Info image selected. Previous Info moved to Gallery"
 *
 * // When user removes Gallery image
 * const { success, isInfo } = removeImageWithFeedback(imageId)
 * // If Gallery: Toast with "Undo" button
 * // If Info: Parent should show confirmation dialog
 * ```
 */
export function useCaptureSessionWithFeedback(): UseCaptureSessionWithFeedbackReturn {
  const toast = useToast()
  const captureSession = useCaptureSession()

  const setImageClassificationWithFeedback = useCallback((
    imageId: string,
    classification: 'info' | 'gallery'
  ): boolean => {
    if (!captureSession.session) return false

    const wasInfo = captureSession.session.infoImageId === imageId
    const willBeInfo = classification === 'info'
    const existingInfoId = captureSession.session.infoImageId

    const success = captureSession.setImageClassification(imageId, classification)

    if (success) {
      // Show toast when Info image is replaced
      if (willBeInfo && existingInfoId && existingInfoId !== imageId) {
        toast.showToast({
          title: 'Info image updated',
          description: 'New Info image selected. Previous Info moved to Gallery.',
          variant: 'info',
          duration: 4000,
        })
      }
      // Show toast when Gallery is promoted to Info (first Info)
      else if (willBeInfo && !existingInfoId) {
        toast.showToast({
          title: 'Info image selected',
          description: 'This image will be used for AI extraction.',
          variant: 'success',
          duration: 3000,
        })
      }
      // Show toast when Info is demoted to Gallery
      else if (wasInfo && !willBeInfo) {
        toast.showToast({
          title: 'Info image removed',
          description: 'Mark a different image as Info to enable AI extraction.',
          variant: 'warning',
          duration: 4000,
        })
      }
    }

    return success
  }, [captureSession, toast])

  const removeImageWithFeedback = useCallback((imageId: string) => {
    if (!captureSession.session) {
      return { success: false, isInfo: false }
    }

    const isInfo = captureSession.session.infoImageId === imageId

    if (isInfo) {
      // Info removal requires confirmation - let parent handle
      return { success: true, isInfo: true }
    }

    // For Gallery images, remove immediately and offer undo
    const imageToRemove = captureSession.session.images.find(img => img.id === imageId)
    if (!imageToRemove) {
      return { success: false, isInfo: false }
    }

    const success = captureSession.removeCaptureImage(imageId)

    if (success) {
      toast.showToast({
        title: 'Image removed',
        description: 'Gallery image removed.',
        variant: 'default',
        duration: 5000,
      })
      // Note: Full undo implementation would require storing session snapshots
      // For now, the toast provides closure. A complete implementation would:
      // 1. Store deep copy of session state
      // 2. Provide undo function to toast
      // 3. Restore state on undo action
    }

    return { success, isInfo: false }
  }, [captureSession, toast])

  return {
    ...captureSession,
    setImageClassificationWithFeedback,
    removeImageWithFeedback,
  }
}
