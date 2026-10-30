/**
 * Style Capture Flow Component
 *
 * Orchestrates the complete style creation flow with all screens:
 * 1. Capture - Add images and select Info image
 * 2. Processing - AI extraction from Info image (image-first)
 * 3. Review - Edit extracted data (image-led)
 * 4. Success - Confirmation screen
 *
 * IMAGE-FIRST DESIGN:
 * - Large hero image in processing
 * - Hero + thumbnail strip in review
 * - Gallery always visible
 * - Visual distinction from vendor flow
 *
 * DESIGN ALIGNED:
 * - Premium surfaces with warm orange accent
 * - Clear visual hierarchy and flow progress
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Camera, AlertTriangle } from 'lucide-react'
import { Button, AppFrame, AppHeader } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { CaptureSessionPanel } from '@/components/capture/CaptureSessionPanel'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { StyleProcessingScreen } from './ProcessingScreen'
import { StyleReviewScreen } from './StyleReviewScreen'
import { StyleSuccessScreen } from './StyleSuccessScreen'
import { useStyleCaptureFlow } from '@/features/styles/hooks'
import { useImageCapture } from '@/hooks/useImageCapture'

export interface StyleCaptureFlowProps {
  /** Event ID for navigation */
  eventId: string
  /** Vendor ID for the style being created */
  vendorId: string
  /** Callback when style is successfully created */
  onSuccess?: (styleId: string) => void
  /** Callback when flow is cancelled */
  onCancel?: () => void
  /** Additional className */
  className?: string
  /** Whether to auto-navigate to style detail after success */
  autoNavigateOnSuccess?: boolean
}

/**
 * Style capture flow component
 *
 * This is the main entry point for the style creation flow.
 * It manages all screens and state transitions.
 *
 * @example
 * ```tsx
 * <StyleCaptureFlow
 *   eventId="event-123"
 *   vendorId="vendor-123"
 *   onSuccess={(styleId) => navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`)}
 *   onCancel={() => navigate(`/events/${eventId}/vendors/${vendorId}/styles`)}
 *   autoNavigateOnSuccess
 * />
 * ```
 */
export function StyleCaptureFlow({
  eventId,
  vendorId,
  onSuccess,
  onCancel,
  className,
  autoNavigateOnSuccess = false,
}: StyleCaptureFlowProps) {
  const navigate = useNavigate()

  // Confirmation dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const { showToast } = useToast()

  const {
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
  } = useStyleCaptureFlow({
    eventId,
    vendorId,
    onSuccess: (styleId) => {
      // Call the original onSuccess callback
      onSuccess?.(styleId)

      // Auto-navigate to style detail if enabled
      if (autoNavigateOnSuccess) {
        navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`)
      }
    },
    onCancel,
  })

  // Image capture — uses camera on native, file picker on web
  const { captureImage, inputRef, handleChange, accept, multiple } = useImageCapture({
    onImageCaptured: (image) => {
      captureSession.addCaptureImage(image.uri, 'gallery')
    },
    onPermissionDenied: () => {
      showToast({
        title: 'Camera access denied',
        description: 'Enable camera access in Settings to capture photos',
        variant: 'error',
        duration: 5000,
      })
    },
  })

  // Check if there are any captured images
  const hasImages = useMemo(() => {
    return (captureSession.session?.images.length ?? 0) > 0
  }, [captureSession.session?.images.length])

  // Handle cancel click - show confirmation if images exist
  const handleCancelClick = useCallback(() => {
    if (hasImages) {
      setShowCancelConfirm(true)
    } else {
      cancelFlow()
    }
  }, [hasImages, cancelFlow])

  // Confirm cancel
  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false)
    cancelFlow()
  }, [cancelFlow])

  // Auto-start flow on mount (only once)
  const hasStartedRef = useRef(false)
  useEffect(() => {
    if (!hasStartedRef.current) {
      hasStartedRef.current = true
      startFlow()
    }
  }, [startFlow])

  // Get validation state for capture session
  const validation = useMemo(() => {
    return captureSession.validate()
  }, [captureSession])

  // Get Info image for processing screen
  const infoImage = useMemo(() => {
    return captureSession.getInfoImage()
  }, [captureSession])

  // Get all images for review screen thumbnail strip
  const allImages = useMemo(() => {
    return captureSession.session?.images || []
  }, [captureSession.session?.images])

  // Render current screen based on flow state
  const renderScreen = () => {
    switch (state.currentScreen) {
      case 'capture':
        return (
          <div className="space-y-6">
            {/* Capture Session Panel */}
            <CaptureSessionPanel
              session={captureSession.session}
              validation={validation}
              onImageRemove={(imageId) => captureSession.removeCaptureImage(imageId)}
              onClassificationToggle={(imageId) =>
                captureSession.setImageClassification(
                  imageId,
                  captureSession.session?.images.find((img) => img.id === imageId)?.classification === 'info'
                    ? 'gallery'
                    : 'info'
                )
              }
              onAddMore={captureImage}
              showExplanation
              onInfoReplaced={() => {
                showToast({
                  title: 'Info image replaced',
                  description: 'The new image will be used for AI extraction',
                  variant: 'info',
                  duration: 3000,
                })
              }}
            />

            {/* Continue to processing button */}
            {canProceed && (
              <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border pt-4 pb-safe-offset">
                <Button
                  variant="accent"
                  onClick={() => proceedToProcessing()}
                  type="button"
                  className="w-full"
                  radius="pill"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Extract Style Info
                </Button>
              </div>
            )}
          </div>
        )

      case 'processing':
        return (
          <StyleProcessingScreen
            infoImage={infoImage || null}
            isProcessing={state.currentScreen === 'processing' && !state.error}
            error={state.error}
            onRetry={retryProcessing}
            onCancel={goBack}
          />
        )

      case 'review':
        return state.extractionResult ? (
          <StyleReviewScreen
            extractionResult={state.extractionResult}
            infoImage={infoImage || null}
            allImages={allImages}
            isSaving={state.isSaving}
            duplicateInfo={state.duplicateInfo}
            onSave={saveStyle}
            onConfirmDuplicate={confirmDuplicate}
            onBack={goBack}
          />
        ) : null

      case 'success':
        return state.createdStyleId ? (
          <StyleSuccessScreen
            styleId={state.createdStyleId}
            styleName={state.extractionResult?.fields.name}
            onViewStyle={() => {
              // Navigate to style detail
              navigate(`/events/${eventId}/vendors/${vendorId}/styles/${state.createdStyleId}`)
            }}
            onAddAnother={() => {
              // Reset and start new flow
              startFlow()
            }}
          />
        ) : null

      case 'error':
        return (
          <StyleProcessingScreen
            infoImage={infoImage || null}
            isProcessing={false}
            error={state.error || 'An error occurred'}
            onRetry={retryProcessing}
            onCancel={goBack}
          />
        )

      default:
        return null
    }
  }

  return (
    <AppFrame className={className}>
      {/* Flow header */}
      <AppHeader
        title={currentStepLabel}
        subtitle={state.currentScreen !== 'success' && state.currentScreen !== 'error' ? `Step ${currentStep} of ${totalSteps}` : undefined}
        rightAction={
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCancelClick}
            type="button"
          >
            <X className="h-5 w-5" />
          </Button>
        }
      />

      {/* Progress bar */}
      {state.currentScreen !== 'success' && state.currentScreen !== 'error' && (
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-orange-500 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <main className="px-4 py-6 pb-safe-offset">
        {renderScreen()}
      </main>

      {/* Cancel confirmation dialog */}
      <ConfirmationDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmCancel}
        title="Discard Style?"
        description="You have captured images that will be lost if you cancel. Are you sure you want to discard this style?"
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="destructive"
        icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
      />

      {/* Hidden file input for image picker */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        style={{ display: 'none' }}
        tabIndex={-1}
      />
    </AppFrame>
  )
}
