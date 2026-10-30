/**
 * Style Capture Flow Hook
 *
 * Orchestrates the complete style creation flow:
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
import { styleFlowReducer, INITIAL_STYLE_FLOW_STATE, type StyleFlowState, type StyleFlowAction } from '@/features/styles/flow/types'
import { extractFabricDocument } from '@/features/styles/api/extractFabricDocument'
import { commitReviewedFabric } from '@/features/styles/api/commitReviewedFabricDocument'
import { uploadCaptureImage } from '@/lib/upload/imageUpload'
import { createScanSession } from '@/lib/scanSession/scanSessionService'
import { useInvalidateStyles } from './useStyleQueries'
import type { ExtractedStylePayload } from '@/features/styles/types/fabricExtraction'
import { toCamelCase } from '@/utils/caseMapping'
import { startExtractionTrace, classifyExtractionError } from '@/lib/monitoring'
import { isNetworkError, saveStyleCaptureOffline } from '@/lib/offline/offlineCaptureService'
import { createLogger } from '@/lib/logger'

import { checkDuplicateStyle } from '@/features/styles/api/checkDuplicateStyle'
import { computeDeltas } from '@/lib/deltaTracking'
import { evaluateExtractionAlerts } from '@/lib/alerting/extractionAlerts'

const logger = createLogger('StyleCaptureFlow')

export interface UseStyleCaptureFlowOptions {
  /** Event ID for the style being created */
  eventId: string
  /** Vendor ID for the style being created */
  vendorId: string
  /** Callback when style is successfully created */
  onSuccess?: (styleId: string) => void
  /** Callback when flow is cancelled */
  onCancel?: () => void
}

export interface UseStyleCaptureFlowReturn {
  /** Current flow state */
  state: StyleFlowState

  /** Capture session methods */
  captureSession: ReturnType<typeof useCaptureSession>

  /** Start the style capture flow */
  startFlow: () => void

  /** Proceed from capture to processing */
  proceedToProcessing: () => Promise<void>

  /** Proceed from review to save */
  saveStyle: (fields: Record<string, string>, heroImageId?: string, skipDuplicateCheck?: boolean) => Promise<void>

  /** Confirm a duplicate and proceed anyway */
  confirmDuplicate: () => Promise<void>

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
 * Hook for managing the style capture flow
 *
 * @example
 * ```tsx
 * const { state, startFlow, proceedToProcessing, saveStyle, captureSession } = useStyleCaptureFlow({
 *   vendorId: 'vendor-123',
 *   onSuccess: (styleId) => navigate(`/styles/${styleId}`)
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
 * await saveStyle(state.extractionResult!.fields)
 * ```
 */
export function useStyleCaptureFlow({
  eventId,
  vendorId,
  onSuccess,
  onCancel,
}: UseStyleCaptureFlowOptions): UseStyleCaptureFlowReturn {
  // Use capture session hook for image management
  const captureSession = useCaptureSession()

  // Invalidate style cache after a successful commit so the new style is visible
  const invalidateStyles = useInvalidateStyles(vendorId)

  // Keep a ref to the latest captureSession to avoid infinite loops
  const captureSessionRef = useRef(captureSession)
  captureSessionRef.current = captureSession

  // Flow state management
  const [state, setState] = useState<StyleFlowState>(INITIAL_STYLE_FLOW_STATE)

  // Dispatch helper
  const dispatch = useCallback((action: StyleFlowAction) => {
    setState((prev) => styleFlowReducer(prev, action))
  }, [])

  // Start the flow - initialize capture session
  // NOTE: This must only be called once to avoid infinite loops
  const startFlow = useCallback(() => {
    dispatch({ type: 'START_CAPTURE', entityType: 'style' })
    // Use ref to access latest captureSession without creating dependency
    captureSessionRef.current.startSession('fabric_style')
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
    const trace = startExtractionTrace('fabric', {
      eventId,
      vendorId,
      scanType: 'fabric_card',
    })

    try {
      // STEP 1: Upload ALL images to Supabase storage
      const imageUploads = await trace.span('upload_images', () =>
        Promise.all(
          session.images.map(async (image) => {
            // Skip if already uploaded and has storagePath
            if (image.storagePath && !isLocalFileUri(image.uri)) {
              return {
                image,
                uploaded: false,
                storagePath: image.storagePath,
                signedUrl: image.uri,
                mimeType: image.mimeType
              }
            }

            // Skip if already a public URL (not a local file URI)
            if (!isLocalFileUri(image.uri)) {
              return { image, uploaded: false }
            }

            const uploadResult = await uploadCaptureImage(image.uri, { eventId, vendorId })
            return {
              image,
              uploaded: true,
              storagePath: uploadResult.storagePath,
              signedUrl: uploadResult.signedUrl,
              publicUrl: uploadResult.publicUrl,
              mimeType: uploadResult.mimeType
            }
          })
        )
      )

      // Update capture session with uploaded URLs and storage paths
      const updatedSession = { ...session }
      for (const upload of imageUploads) {
        if (upload.storagePath) {
          // Update the image in the session
          const imageIndex = updatedSession.images.findIndex(img => img.id === upload.image.id)
          if (imageIndex !== -1) {
            updatedSession.images[imageIndex] = {
              ...updatedSession.images[imageIndex],
              uri: upload.signedUrl || updatedSession.images[imageIndex].uri,
              storagePath: upload.storagePath,
              publicUrl: upload.publicUrl || updatedSession.images[imageIndex].publicUrl,
              mimeType: upload.mimeType || updatedSession.images[imageIndex].mimeType
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

      // Get the Info image from the updated session
      const updatedInfoImage = updatedSession.images.find(img => img.id === infoImage.id)
      if (!updatedInfoImage || !updatedInfoImage.storagePath) {
        throw new Error('Info image was not correctly uploaded')
      }

      // STEP 2: Create scan session
      const scanSessionId = await trace.span('create_session', () =>
        createScanSession({
          eventId,
          vendorId,
          scanType: 'fabric_card',
          sourceImagePath: updatedInfoImage.storagePath,
          sourceImageUrl: updatedInfoImage.publicUrl || updatedInfoImage.uri,
        })
      )

      trace.updateContext({ scanSessionId })

      // STEP 3: Call real extraction edge function
      const extractionResult = await trace.span('extract', () =>
        extractFabricDocument({
          scanSessionId,
          eventId,
          vendorId,
          storagePath: updatedInfoImage.storagePath ?? '',
          mimeType: updatedInfoImage.mimeType || 'image/webp',
          scanType: 'fabric_card',
        })
      )

      // STEP 4: Map extraction result to review form format (fabric → Style)
      const reviewFields = mapExtractedStyleToReviewFields(extractionResult.style)

      trace.finish()

      // Evaluate extraction alerts for low confidence
      const avgConfidence = computeAverageConfidence(extractionResult.metadata.confidence_scores)
      const alerts = evaluateExtractionAlerts({
        confidence: avgConfidence,
        warnings: [],
        entityType: 'style',
        entityId: scanSessionId,
      })
      if (alerts.length > 0) {
        for (const alert of alerts) {
          logger.warn(`Extraction alert: ${alert.message}`, {
            type: alert.type,
            severity: alert.severity,
            entityId: alert.entityId,
          })
        }
      }

      // Store scan session ID and source image info for commit phase
      dispatch({
        type: 'PROCESSING_COMPLETE',
        result: {
          status: 'success',
          extractedAt: new Date().toISOString(),
          sourceImageId: infoImage.id,
          confidence: {},
          fields: reviewFields as any, // Type assertion for compatibility with flow state
          warnings: [],
          scanSessionId, // Store for commit phase (not in type but used internally)
          sourceImagePath: updatedInfoImage.storagePath,
          sourceImageUrl: updatedInfoImage.publicUrl || updatedInfoImage.uri,
        } as any, // Type assertion to allow extra fields for internal use
      })
    } catch (error) {
      trace.finishWithError(error)

      // Classify error for better user message
      const classification = classifyExtractionError(error)

      // If this is a network/connectivity error, save offline for sync
      if (classification.category === 'network' || classification.category === 'timeout' || isNetworkError(error)) {
        try {
          const offlineResult = await saveStyleCaptureOffline({
            eventId,
            vendorId,
            scanType: 'fabric_card',
            captureImages: session.images,
            infoImageId: infoImage.id,
          })

          logger.info('Style capture saved for offline sync', { draftId: offlineResult.draftId })

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
  }, [dispatch, eventId, vendorId, syncCaptureSession])

  // Helper to check if URI is a local file that needs upload
  function isLocalFileUri(uri: string): boolean {
    return uri.startsWith('file://') ||
           uri.startsWith('capacitor://') ||
           uri.startsWith('content://') ||
           uri.startsWith('blob:')
  }

  // Ref to store pending save data for duplicate confirmation
  const pendingSaveRef = useRef<{
    fields: Record<string, string>
    heroImageId?: string
  } | null>(null)

  // Commit reviewed style (REAL COMMIT)
  const saveStyle = useCallback(async (fields: Record<string, string>, heroImageId?: string, skipDuplicateCheck = false) => {
    dispatch({ type: 'START_SAVE' })

    try {
      // Get scan session ID from extraction result
      const scanSessionId = (state.extractionResult as any)?.scanSessionId
      if (!scanSessionId) {
        throw new Error('No scan session ID available for commit')
      }

      // STEP 1: Duplicate Check
      if (!skipDuplicateCheck && fields.itemCode) {
        const dupCheck = await checkDuplicateStyle({
          itemCode: fields.itemCode,
          vendorId,
        })

        if (dupCheck.isDuplicate) {
          // Store data for confirmation
          pendingSaveRef.current = { fields, heroImageId }
          dispatch({ 
            type: 'DUPLICATE_FOUND', 
            itemCode: fields.itemCode, 
            existingStyle: dupCheck.existingStyle 
          })
          return
        }
      }

      // Compute edit deltas for audit trail
      const extractedFields = (state.extractionResult as any)?.fields || {}
      const fieldLabels: Record<string, string> = {
        itemCode: 'Item Code', name: 'Name', composition: 'Composition',
        category: 'Category', construction: 'Construction', finish: 'Finish',
        pattern: 'Pattern', widthCm: 'Width (cm)', widthIn: 'Width (in)',
        weightGsm: 'Weight (gsm)', weightOzsy: 'Weight (oz/yd)',
        season: 'Season', price: 'Price', currency: 'Currency', priceUnit: 'Price Unit',
      }
      const deltas = computeDeltas(
        extractedFields as Record<string, unknown>,
        fields as Record<string, unknown>,
        fieldLabels
      )

      // Build reviewed document from form fields (matches fabricCommit structure)
      const styleDocument = {
        item_code: fields.itemCode || null,
        name: fields.name || null,
        composition: fields.composition || null,
        category: fields.category || null,
        construction: fields.construction || null,
        finish: fields.finish || null,
        pattern: fields.pattern || null,
        width_cm: fields.widthCm ? parseFloat(fields.widthCm) : null,
        width_in: fields.widthIn ? parseFloat(fields.widthIn) : null,
        weight_gsm: fields.weightGsm ? parseFloat(fields.weightGsm) : null,
        weight_ozsy: fields.weightOzsy ? parseFloat(fields.weightOzsy) : null,
        season: fields.season || null,
        metadata: null,
      }

      // Build prices array from form fields if price is provided
      const priceValue = fields.price ? parseFloat(fields.price) : 0
      const prices = priceValue > 0 && fields.currency && fields.priceUnit
        ? [{
            price: {
              currency: fields.currency || null,
              price: priceValue,
              price_unit: fields.priceUnit || null,
            },
          }]
        : []

      // Build source images array from all session images
      // If heroImageId is provided, put that image first so it's marked as primary by the edge function
      const images = captureSessionRef.current.session?.images || []
      
      const heroId = heroImageId || (state.extractionResult as any)?.sourceImageId
      const heroImage = images.find(img => img.id === heroId) || images[0]
      const otherImages = images.filter(img => img.id !== heroImage?.id)
      
      const sortedImages = heroImage ? [heroImage, ...otherImages] : otherImages
      
      const sourceImagePaths = sortedImages.map(img => img.storagePath).filter((p): p is string => !!p)
      const sourceImageUrls = sortedImages
        .map(img => img.publicUrl || img.uri)
        .filter((u): u is string => !!u)

      // Call real commit function
      const commitResult = await commitReviewedFabric({
        scanSessionId,
        eventId,
        vendorId,
        reviewedDocument: {
          style: styleDocument,
          variants: [],
          inventory: [],
          prices,
        },
        sourceImagePaths: sourceImagePaths.length > 0 ? sourceImagePaths : null,
        sourceImageUrls: sourceImageUrls.length > 0 ? sourceImageUrls : null,
        editDeltas: deltas.length > 0 ? deltas : undefined,
      })

      dispatch({ type: 'SAVE_COMPLETE', styleId: commitResult.style_id })

      // Invalidate TanStack Query cache so the new style is visible immediately
      invalidateStyles()

      onSuccess?.(commitResult.style_id)
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : (typeof error === 'object' && error !== null && 'message' in error)
          ? String((error as { message: unknown }).message)
          : 'Commit failed'
      dispatch({ type: 'SAVE_FAILED', error: message })
    }
  }, [dispatch, eventId, vendorId, state.extractionResult, onSuccess, invalidateStyles])

  // Confirm duplicate and proceed anyway
  const confirmDuplicate = useCallback(async () => {
    if (!pendingSaveRef.current) return
    const { fields, heroImageId } = pendingSaveRef.current
    dispatch({ type: 'CONFIRM_DUPLICATE' })
    await saveStyle(fields, heroImageId, true)
  }, [saveStyle])

  // Go back in flow
  const goBack = useCallback(() => {
    const currentScreen = state.currentScreen

    // Define back navigation rules
    const backMap: Record<StyleFlowState['currentScreen'], StyleFlowState['currentScreen'] | null> = {
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
    const labels: Record<StyleFlowState['currentScreen'], string> = {
      capture: 'Capture Style',
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
    const stepMap: Record<StyleFlowState['currentScreen'], number> = {
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
    saveStyle,
    confirmDuplicate,
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
 * Map extracted style document to review form fields.
 *
 * Uses centralized toCamelCase() for key conversion, then applies
 * style-specific post-processing (numeric fields → string,
 * null → empty string defaults, drop metadata/variants).
 */
function mapExtractedStyleToReviewFields(
  style: ExtractedStylePayload
): Record<string, string> {
  // Convert all keys from snake_case to camelCase
  const camel = toCamelCase(style) as unknown as Record<string, unknown>

  // Post-processing: numeric fields → string, null → empty string
  // Drop metadata and variants (not needed in review form)
  // Default style name to item code when extraction returns empty name
  const itemCode = String(camel.itemCode ?? '')
  return {
    itemCode,
    name: String(camel.name ?? '') || itemCode,
    composition: String(camel.composition ?? ''),
    category: String(camel.category ?? ''),
    construction: String(camel.construction ?? ''),
    finish: String(camel.finish ?? ''),
    pattern: String(camel.pattern ?? ''),
    widthCm: camel.widthCm != null ? String(camel.widthCm) : '',
    widthIn: camel.widthIn != null ? String(camel.widthIn) : '',
    weightGsm: camel.weightGsm != null ? String(camel.weightGsm) : '',
    weightOzsy: camel.weightOzsy != null ? String(camel.weightOzsy) : '',
    season: String(camel.season ?? ''),
    price: '',
    currency: 'USD',
    priceUnit: 'yard',
  }
}

/**
 * Compute average confidence from per-field confidence scores.
 *
 * Returns null if no scores are present (e.g., manual entry or
 * extraction service did not return confidence data).
 */
function computeAverageConfidence(
  scores: Record<string, number> | undefined
): number | null {
  if (!scores || typeof scores !== 'object') return null
  const values = Object.values(scores).filter((v) => typeof v === 'number')
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}
