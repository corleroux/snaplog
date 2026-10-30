/**
 * Vendor Capture Flow Component
 *
 * Orchestrates the complete vendor creation flow with all screens:
 * 1. Capture - Add images and select Info image
 * 2. Processing - AI extraction from Info image
 * 3. Review - Edit extracted data
 * 4. Success - Confirmation screen
 *
 * DESIGN ALIGNED:
 * - Premium surfaces with warm orange accent
 * - Clear visual hierarchy and flow progress
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { type ReactNode, useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { X, Camera, AlertTriangle } from 'lucide-react'
import { Button, AppFrame, AppHeader } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { CaptureSessionPanel } from '@/components/capture/CaptureSessionPanel'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { ProcessingScreen } from './ProcessingScreen'
import { VendorReviewScreen } from './VendorReviewScreen'
import { VendorSuccessScreen } from './VendorSuccessScreen'
import { useVendorCaptureFlow } from '@/features/vendors/hooks'
import { useImageCapture } from '@/hooks/useImageCapture'

export interface VendorCaptureFlowProps {
  /** Event ID for the vendor being created */
  eventId: string
  /** Callback when vendor is successfully created */
  onSuccess?: (vendorId: string) => void
  /** Callback when flow is cancelled */
  onCancel?: () => void
  /** Optional header content */
  headerContent?: ReactNode
  /** Additional className */
  className?: string
}

/**
 * Vendor capture flow component
 *
 * This is the main entry point for the vendor creation flow.
 * It manages all screens and state transitions.
 *
 * @example
 * ```tsx
 * <VendorCaptureFlow
 *   eventId="event-123"
 *   onSuccess={(vendorId) => navigate(`/vendors/${vendorId}`)}
 *   onCancel={() => navigate('/vendors')}
 * />
 * ```
 */
export function VendorCaptureFlow({
  eventId,
  onSuccess,
  onCancel,
  className,
}: VendorCaptureFlowProps) {
  // Confirmation dialog state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const { showToast } = useToast()

  // Store pending form fields for duplicate confirmation
  const pendingFieldsRef = useRef<Record<string, string> | null>(null)

  const {
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
  } = useVendorCaptureFlow({
    eventId,
    onSuccess,
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

  // Wrapper for saveVendor that stores pending fields for duplicate confirmation
  const handleSaveVendor = useCallback(async (fields: Record<string, string>) => {
    pendingFieldsRef.current = fields
    await saveVendor(fields)
  }, [saveVendor])

  // Confirm commit despite duplicate warning
  const handleConfirmDuplicate = useCallback(async () => {
    const fields = pendingFieldsRef.current
    if (fields) {
      await confirmDuplicate(fields)
      pendingFieldsRef.current = null
    }
  }, [confirmDuplicate])

  // Dismiss duplicate warning
  const handleDismissDuplicate = useCallback(() => {
    pendingFieldsRef.current = null
    dismissDuplicate()
  }, [dismissDuplicate])

  // Get validation state for capture session
  const validation = useMemo(() => {
    return captureSession.validate()
  }, [captureSession])

  // Get Info image for processing screen
  const infoImage = useMemo(() => {
    return captureSession.getInfoImage()
  }, [captureSession])

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
                  Extract Vendor Info
                </Button>
              </div>
            )}
          </div>
        )

      case 'processing':
        return (
          <ProcessingScreen
            infoImage={infoImage || null}
            isProcessing={state.currentScreen === 'processing' && !state.error}
            error={state.error}
            onRetry={retryProcessing}
            onCancel={goBack}
          />
        )

      case 'review':
        return state.extractionResult ? (
          <VendorReviewScreen
            extractionResult={state.extractionResult}
            infoImage={infoImage || null}
            isSaving={state.isSaving}
            onSave={handleSaveVendor}
            onBack={goBack}
          />
        ) : null

      case 'success':
        return state.createdVendorId ? (
          <VendorSuccessScreen
            vendorId={state.createdVendorId}
            companyName={state.extractionResult?.fields.companyName}
            onViewVendor={() => {
              // Flow completed - caller handles navigation via onSuccess callback
              onSuccess?.(state.createdVendorId!)
            }}
            onAddAnother={() => {
              // Reset and start new flow
              startFlow()
            }}
          />
        ) : null

      case 'error':
        return (
          <ProcessingScreen
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
        title="Discard Vendor?"
        description="You have captured images that will be lost if you cancel. Are you sure you want to discard this vendor?"
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="destructive"
        icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
      />

      {/* Duplicate vendor warning dialog */}
      <ConfirmationDialog
        isOpen={!!state.duplicateWarning}
        onClose={handleDismissDuplicate}
        onConfirm={handleConfirmDuplicate}
        title="Possible Duplicate Vendor"
        description={
          state.duplicateWarning
            ? `A vendor with name "${state.duplicateWarning.companyName}" already exists for this event${
                state.duplicateWarning.existingVendors[0]?.booth_number
                  ? ` (Booth: ${state.duplicateWarning.existingVendors[0].booth_number})`
                  : ''
              }. Do you want to continue anyway?`
            : ''
        }
        confirmText="Continue Anyway"
        cancelText="Cancel"
        variant="accent"
        icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
        isConfirming={state.isSaving}
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
