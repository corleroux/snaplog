/**
 * Vendor Capture Flow Hook
 *
 * Orchestrates the complete vendor creation flow:
 * 1. Capture images with capture session
 * 2. Upload source image to storage
 * 3. Create scan session
 * 4. Process extraction from Info image (real AI extraction)
 * 5. Review and edit extracted data
 * 6. Commit reviewed data (real backend commit)
 *
 * IMPORTANT: This now uses REAL extraction via edge functions.
 * The create flow follows: capture → upload → extract → review → commit → detail
 */

import { useCallback, useMemo, useState, useRef } from 'react'
import { useCaptureSession } from '@/hooks/useCaptureSession'
import { vendorFlowReducer, INITIAL_VENDOR_FLOW_STATE, type VendorFlowState, type VendorFlowAction } from '@/features/vendors/flow/types'
import { extractVendorDocument } from '@/features/vendors/api/extractVendorDocument'
import { commitReviewedVendor } from '@/features/vendors/api/commitReviewedVendor'
import { checkDuplicateVendor } from '@/features/vendors/api/checkDuplicateVendor'
import { uploadCaptureImage } from '@/lib/upload/imageUpload'
import { createScanSession } from '@/lib/scanSession/scanSessionService'
import { useInvalidateVendors } from './useVendorQueries'
import type { ExtractedVendorDocument } from '@/features/vendors/types/vendorExtraction'
import type { ReviewedVendorDocument } from '@/features/vendors/types/vendorCommit'
import { toCamelCase } from '@/utils/caseMapping'
import { startExtractionTrace, classifyExtractionError } from '@/lib/monitoring'
import { isNetworkError, saveVendorCaptureOffline } from '@/lib/offline/offlineCaptureService'
import { createLogger } from '@/lib/logger'

const logger = createLogger('VendorCaptureFlow')

export interface UseVendorCaptureFlowOptions {
  /** Event ID for the vendor being created */
  eventId: string
  /** Callback when vendor is successfully created */
  onSuccess?: (vendorId: string) => void
  /** Callback when flow is cancelled */
  onCancel?: () => void
}

export interface UseVendorCaptureFlowReturn {
  /** Current flow state */
  state: VendorFlowState

  /** Capture session methods */
  captureSession: ReturnType<typeof useCaptureSession>

  /** Start the vendor capture flow */
  startFlow: () => void

  /** Proceed from capture to processing */
  proceedToProcessing: () => Promise<void>

  /** Proceed from review to save (checks for duplicates first) */
  saveVendor: (fields: Record<string, string>) => Promise<void>

  /** Commit vendor despite duplicate warning */
  confirmDuplicate: (fields: Record<string, string>) => Promise<void>

  /** Dismiss the duplicate warning */
  dismissDuplicate: () => void

  /** Navigate back in flow */
  goBack: () => void

  /** Cancel the flow */
  cancelFlow: () => void

  /** Retry processing after error */
  retryProcessing: () => Promise<void>

  /** Computed flow helpers */
  canProceed: boolean
  currentStepLabel: string
  totalSteps: number
  currentStep: number
}

/**
 * Hook for managing the vendor capture flow
 *
 * @example
 * ```tsx
 * const { state, startFlow, proceedToProcessing, saveVendor, captureSession } = useVendorCaptureFlow({
 *   eventId: 'event-123',
 *   onSuccess: (vendorId) => navigate(`/vendors/${vendorId}`)
 * })
 *
 * // Start the flow
 * startFlow()
 *
 * // Add images via captureSession
 * captureSession.addCaptureImage('file://photo.jpg', 'info')
 *
 * // Proceed to extraction
 * await proceedToProcessing()
 *
 * // Save after review
 * await saveVendor(state.extractionResult!.fields)
 * ```
 */
export function useVendorCaptureFlow({
  eventId,
  onSuccess,
  onCancel,
}: UseVendorCaptureFlowOptions): UseVendorCaptureFlowReturn {
  // Use capture session hook for image management
  const captureSession = useCaptureSession()

  // Invalidate vendor cache after a successful commit so the new vendor is visible
  const invalidateVendors = useInvalidateVendors(eventId)

  // Keep a ref to the latest captureSession to avoid infinite loops
  const captureSessionRef = useRef(captureSession)
  captureSessionRef.current = captureSession

  // Flow state management
  const [state, setState] = useState<VendorFlowState>(INITIAL_VENDOR_FLOW_STATE)

  // Dispatch helper
  const dispatch = useCallback((action: VendorFlowAction) => {
    setState((prev) => vendorFlowReducer(prev, action))
  }, [])

  // Start the flow - initialize capture session
  // NOTE: This must only be called once to avoid infinite loops
  const startFlow = useCallback(() => {
    dispatch({ type: 'START_CAPTURE', entityType: 'vendor' })
    // Use ref to access latest captureSession without creating dependency
    captureSessionRef.current.startSession('vendor')
  }, [dispatch])

  // Sync capture session to flow state
  const syncCaptureSession = useCallback(() => {
    const session = captureSessionRef.current.session
    if (session) {
      dispatch({ type: 'SET_SESSION', session })
    }
  }, [dispatch])

  // Proceed from capture to processing (REAL EXTRACTION)
  const proceedToProcessing = useCallback(async () => {
    syncCaptureSession()

    const session = captureSessionRef.current.session
    if (!session) {
      dispatch({ type: 'PROCESSING_FAILED', error: 'No capture session' })
      return
    }

    // Validate session
    const validation = captureSessionRef.current.validate()
    if (!validation.valid) {
      dispatch({ type: 'PROCESSING_FAILED', error: validation.errors.join(', ') })
      return
    }

    // Check for Info image
    const infoImage = captureSessionRef.current.getInfoImage()
    if (!infoImage) {
      dispatch({ type: 'PROCESSING_FAILED', error: 'No Info image selected for extraction' })
      return
    }

    // Start processing
    dispatch({ type: 'START_PROCESSING' })

    // Start extraction trace for monitoring
    const trace = startExtractionTrace('vendor', {
      eventId,
      scanType: 'vendor_card',
    })

    try {
      // STEP 1: Upload ALL images to Supabase storage
      const imageUploads = await trace.span('upload_images', () =>
        Promise.all(
          session.images.map(async (image) => {
            // Skip if already a public URL (not a local file URI)
            if (!isLocalFileUri(image.uri)) {
              return { image, uploaded: false }
            }

            const uploadResult = await uploadCaptureImage(image.uri, { eventId })
            return {
              image,
              uploaded: true,
              storagePath: uploadResult.storagePath,
              signedUrl: uploadResult.signedUrl,
              publicUrl: uploadResult.publicUrl,
            }
          })
        )
      )

      // Update capture session with uploaded URLs
      const updatedSession = { ...session }
      for (const upload of imageUploads) {
        if (upload.uploaded && upload.signedUrl) {
          // Update the image URI in the session
          const imageIndex = updatedSession.images.findIndex(img => img.id === upload.image.id)
          if (imageIndex !== -1) {
            updatedSession.images[imageIndex] = {
              ...updatedSession.images[imageIndex],
              uri: upload.signedUrl,
            }
          }
        }
      }

      // Update the ref and dispatch
      captureSessionRef.current = {
        ...captureSessionRef.current,
        session: updatedSession,
      }
      dispatch({ type: 'SET_SESSION', session: updatedSession })

      // STEP 2: Upload source image to Supabase storage (Info image)
      const uploadResult = await trace.span('upload_source', () =>
        uploadCaptureImage(infoImage.uri, { eventId })
      )

      // STEP 3: Create scan session
      const scanSessionId = await trace.span('create_session', () =>
        createScanSession({
          eventId,
          scanType: 'vendor_card',
          sourceImagePath: uploadResult.storagePath,
          sourceImageUrl: uploadResult.publicUrl,
        })
      )

      trace.updateContext({ scanSessionId })

      // STEP 4: Call real extraction edge function
      const extractionResult = await trace.span('extract', () =>
        extractVendorDocument({
          scanSessionId,
          eventId,
          storagePath: uploadResult.storagePath,
          mimeType: uploadResult.mimeType,
          scanType: 'vendor_card',
        })
      )

      // STEP 5: Map extraction result to review form format
      const reviewFields = mapExtractedVendorToReviewFields(extractionResult.document)

      trace.finish()

      // Store scan session ID for commit phase
      dispatch({
        type: 'PROCESSING_COMPLETE',
        result: {
          status: 'success',
          extractedAt: new Date().toISOString(),
          sourceImageId: infoImage.id,
          confidence: {},
          fields: reviewFields as any, // Type assertion for compatibility with flow state
          warnings: [],
          scanSessionId, // Store for commit phase
          sourceImagePath: uploadResult.storagePath,
          sourceImageUrl: uploadResult.publicUrl,
        } as any, // Type assertion to allow extra fields for internal use
      })
    } catch (error) {
      trace.finishWithError(error)

      // Classify error for better user message
      const classification = classifyExtractionError(error)

      // If this is a network/connectivity error, save offline for sync
      if (classification.category === 'network' || classification.category === 'timeout' || isNetworkError(error)) {
        try {
          const offlineResult = await saveVendorCaptureOffline({
            eventId,
            scanType: 'vendor_card',
            captureImages: session.images,
            infoImageId: infoImage.id,
          })

          logger.info('Vendor capture saved for offline sync', { draftId: offlineResult.draftId })

          dispatch({
            type: 'PROCESSING_FAILED',
            error: 'No connection — your capture has been saved and will be processed automatically when you\'re back online.',
            suggestedAction: 'Check your internet connection. Your data is safe and will sync when connectivity returns.',
            retryable: false,
            savedOffline: true,
          } as any)
          return
        } catch (offlineErr) {
          logger.error('Failed to save offline', { error: String(offlineErr) })
          // Fall through to normal error handling
        }
      }

      const errorMessage = classification.userMessage || (error instanceof Error ? error.message : 'Extraction failed')
      dispatch({
        type: 'PROCESSING_FAILED',
        error: errorMessage,
        suggestedAction: classification.suggestedAction,
        retryable: classification.retryable,
      } as any)
    }
  }, [dispatch, eventId, syncCaptureSession])

  // Helper to check if URI is a local file that needs upload
  function isLocalFileUri(uri: string): boolean {
    return uri.startsWith('file://') ||
           uri.startsWith('capacitor://') ||
           uri.startsWith('content://') ||
           uri.startsWith('blob:')
  }

  // Commit reviewed vendor (REAL COMMIT)
  const saveVendor = useCallback(async (fields: Record<string, string>) => {
    dispatch({ type: 'START_SAVE' })

    try {
      // Check for duplicates before committing
      const companyName = fields.companyName || ''
      const duplicateCheck = await checkDuplicateVendor({ companyName, eventId })

      if (duplicateCheck.isDuplicate) {
        dispatch({
          type: 'DUPLICATE_FOUND',
          companyName,
          existingVendors: duplicateCheck.existingVendors,
        })
        return
      }

      // No duplicate — proceed with commit
      await commitVendorInternal(fields)
    } catch (error) {
      // If duplicate check fails, proceed with commit anyway (graceful)
      try {
        await commitVendorInternal(fields)
      } catch (commitError) {
        const message = commitError instanceof Error
          ? commitError.message
          : (typeof commitError === 'object' && commitError !== null && 'message' in commitError)
            ? String((commitError as { message: unknown }).message)
            : 'Commit failed'
        dispatch({ type: 'SAVE_FAILED', error: message })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, eventId, state.extractionResult, onSuccess, invalidateVendors])

  // Internal commit logic shared between saveVendor and confirmDuplicate
  const commitVendorInternal = useCallback(async (fields: Record<string, string>) => {
    // Get scan session ID from extraction result
    const scanSessionId = (state.extractionResult as any)?.scanSessionId
    if (!scanSessionId) {
      throw new Error('No scan session ID available for commit')
    }

    // Build reviewed document from form fields
    const reviewedDocument: ReviewedVendorDocument = {
      company_name: fields.companyName || '',
      booth_number: fields.boothNumber || null,
      contact_person: fields.contactPerson || null,
      email: fields.email || null,
      phone: fields.phone || null,
      whatsapp: null, // Not in form
      website_url: fields.website || null,
      address: fields.address || null,
      country_of_origin: fields.countryOfOrigin || null,
      brand_names: fields.brandNames ? fields.brandNames.split(',').map(b => b.trim()).filter(Boolean) : null,
      notes: fields.notes || null,
    }

    // Get source image info from extraction result
    const extractionResult = state.extractionResult as any
    const sourceImagePath = extractionResult?.sourceImagePath
    const sourceImageUrl = extractionResult?.sourceImageUrl

    // Call real commit function
    const commitResult = await commitReviewedVendor({
      scanSessionId,
      eventId,
      reviewedDocument,
      sourceImagePath,
      sourceImageUrl,
    })

    dispatch({ type: 'SAVE_COMPLETE', vendorId: commitResult.vendor_id })

    // Invalidate vendor cache so the new vendor is visible immediately on the list screen
    invalidateVendors()

    onSuccess?.(commitResult.vendor_id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, eventId, state.extractionResult, onSuccess, invalidateVendors])

  // Commit despite duplicate warning
  const confirmDuplicate = useCallback(async (fields: Record<string, string>) => {
    dispatch({ type: 'DISMISS_DUPLICATE' })
    dispatch({ type: 'START_SAVE' })

    try {
      await commitVendorInternal(fields)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? String((error as { message: unknown }).message)
          : 'Commit failed'
      dispatch({ type: 'SAVE_FAILED', error: message })
    }
  }, [commitVendorInternal, dispatch])

  // Dismiss duplicate warning without committing
  const dismissDuplicate = useCallback(() => {
    dispatch({ type: 'DISMISS_DUPLICATE' })
  }, [dispatch])

  // Go back in flow
  const goBack = useCallback(() => {
    const currentScreen = state.currentScreen

    // Define back navigation rules
    const backMap: Record<VendorFlowState['currentScreen'], VendorFlowState['currentScreen'] | null> = {
      capture: null, // Can't go back from start
      processing: 'capture',
      review: 'capture', // Can go back to capture to change images
      success: null, // Can't go back from success
      error: 'capture', // Can retry from error
    }

    const previousScreen = backMap[currentScreen] || null
    if (previousScreen) {
      dispatch({ type: 'GO_TO_SCREEN', screen: previousScreen })
    }
  }, [state.currentScreen, dispatch])

  // Cancel flow
  const cancelFlow = useCallback(() => {
    dispatch({ type: 'RESET' })
    captureSessionRef.current.endSession()
    onCancel?.()
  }, [dispatch, onCancel])

  // Retry processing after error
  const retryProcessing = useCallback(async () => {
    await proceedToProcessing()
  }, [proceedToProcessing])

  // Computed helpers - canProceed is derived from current session state
  // Computed on each render to react to session changes
  const canProceed = (() => {
    const currentSession = captureSessionRef.current.session
    if (!currentSession) return false

    // At least one image required
    if (currentSession.images.length === 0) return false

    // Info image required for extraction
    if (!currentSession.infoImageId) return false

    return true
  })() // IIFE to compute on each render

  const currentStepLabel = useMemo(() => {
    const screen = state.currentScreen || 'capture'
    const labels: Record<VendorFlowState['currentScreen'], string> = {
      capture: 'Capture Vendor',
      processing: 'Processing',
      review: 'Review',
      success: 'Complete',
      error: 'Error',
    }
    return labels[screen]
  }, [state.currentScreen])

  const totalSteps = 3 // Capture, Process, Review
  const currentStep = useMemo(() => {
    const screen = state.currentScreen || 'capture'
    const stepMap: Record<VendorFlowState['currentScreen'], number> = {
      capture: 1,
      processing: 2,
      review: 3,
      success: 3,
      error: 2,
    }
    return stepMap[screen]
  }, [state.currentScreen])

  return {
    state,
    captureSession,
    startFlow,
    proceedToProcessing,
    saveVendor,
    confirmDuplicate,
    dismissDuplicate,
    goBack,
    cancelFlow,
    retryProcessing,
    canProceed,
    currentStepLabel,
    totalSteps,
    currentStep,
  }
}

/**
 * Map extracted vendor document to review form fields.
 *
 * Uses centralized toCamelCase() for key conversion, then applies
 * vendor-specific post-processing (brand_names array → string,
 * website_url → website rename, null → empty string defaults).
 */
function mapExtractedVendorToReviewFields(
  document: ExtractedVendorDocument
): Record<string, string> {
  // Convert all keys from snake_case to camelCase
  const camel = toCamelCase(document) as unknown as Record<string, unknown>

  // Post-processing: brandNames array → comma-separated string
  // Post-processing: websiteUrl → website (form field name differs from extraction field)
  // Post-processing: null/undefined → empty string for all form fields
  const { websiteUrl, brandNames, whatsapp, ...rest } = camel

  return {
    companyName: String(rest.companyName ?? ''),
    boothNumber: String(rest.boothNumber ?? ''),
    contactPerson: String(rest.contactPerson ?? ''),
    email: String(rest.email ?? ''),
    phone: String(rest.phone ?? ''),
    website: String(websiteUrl ?? ''),
    address: String(rest.address ?? ''),
    countryOfOrigin: String(rest.countryOfOrigin ?? ''),
    brandNames: Array.isArray(brandNames) ? brandNames.join(', ') : '',
    notes: String(rest.notes ?? ''),
  }
}
