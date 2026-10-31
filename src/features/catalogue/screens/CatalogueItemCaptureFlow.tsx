/**
 * Schema-driven catalogue item capture flow (FR-SCH-05).
 *
 * Picker → capture → processing → review → success. Fabric and vendor hand
 * off to the existing flows; garments run the schema-driven path in-flow;
 * rack video links to the FR-VID flow.
 */

import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Camera, AlertTriangle } from 'lucide-react'
import { Button, BottomActionBar, AppFrame, AppHeader } from '@/components/ui'
import { LoadingState } from '@/components/ui/LoadingState'
import { useToast } from '@/components/ui/toast'
import { CaptureSessionPanel } from '@/components/capture/CaptureSessionPanel'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { useCatalogueItemCaptureFlow } from '../hooks/useCatalogueItemCaptureFlow'
import { CatalogueTypePicker, type PickerSelection } from '../components/CatalogueTypePicker'
import { CatalogueItemReviewScreen } from './CatalogueItemReviewScreen'
import { useImageCapture } from '@/hooks/useImageCapture'

export interface CatalogueItemCaptureFlowProps {
  eventId: string
  vendorId: string
  onSuccess?: (itemId: string) => void
  onCancel?: () => void
  className?: string
}

export function CatalogueItemCaptureFlow({
  eventId,
  vendorId,
  onSuccess,
  onCancel,
  className,
}: CatalogueItemCaptureFlowProps) {
  const navigate = useNavigate()
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const { showToast } = useToast()

  const {
    state,
    reviewedValues,
    captureSession,
    selectGarmentType,
    proceedToProcessing,
    handleFieldChange,
    saveItem,
    goBack,
    retryProcessing,
    cancelFlow,
    canProceed,
  } = useCatalogueItemCaptureFlow({ eventId, vendorId, onSuccess, onCancel })

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

  const hasImages = useMemo(() => {
    return (captureSession.session?.images.length ?? 0) > 0
  }, [captureSession.session?.images.length])

  const handleCancelClick = useCallback(() => {
    if (hasImages) {
      setShowCancelConfirm(true)
    } else {
      cancelFlow()
    }
  }, [hasImages, cancelFlow])

  const handleConfirmCancel = useCallback(() => {
    setShowCancelConfirm(false)
    cancelFlow()
  }, [cancelFlow])

  const handlePickerSelect = useCallback(
    (selection: PickerSelection) => {
      if (selection.kind === 'existing' && selection.slug === 'fabric') {
        navigate(`/events/${eventId}/vendors/${vendorId}/styles/new/capture`)
      } else if (selection.kind === 'existing' && selection.slug === 'vendor') {
        navigate(`/events/${eventId}/vendors/new/capture`)
      } else if (selection.kind === 'video') {
        navigate(`/events/${eventId}/vendors/${vendorId}/items/video`)
      } else if (selection.kind === 'catalogue') {
        void selectGarmentType(selection.definition.slug)
      }
    },
    [navigate, eventId, vendorId, selectGarmentType]
  )

  const infoImage = useMemo(() => captureSession.getInfoImage(), [captureSession])
  const allImages = useMemo(() => captureSession.session?.images || [], [captureSession.session?.images])
  const validation = useMemo(() => captureSession.validate(), [captureSession])

  const title = state.definition ? `New ${state.definition.display_name}` : 'New Item'

  return (
    <AppFrame className={className}>
      <AppHeader
        title={title}
        rightAction={
          <Button variant="ghost" size="icon" aria-label="Discard and close" onClick={handleCancelClick} type="button">
            <X className="h-5 w-5" />
          </Button>
        }
      />

      <main className="px-4 py-6 pb-safe-offset">
        {state.screen === 'picker' && <CatalogueTypePicker onSelect={handlePickerSelect} />}

        {state.screen === 'capture' && (
          <div className="space-y-6">
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
            />

            {canProceed && (
              <BottomActionBar>
                <Button
                  variant="accent"
                  onClick={() => proceedToProcessing()}
                  type="button"
                  className="w-full"
                  radius="pill"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Extract Item Info
                </Button>
              </BottomActionBar>
            )}
          </div>
        )}

        {(state.screen === 'processing' || state.screen === 'error') && (
          <div className="space-y-4 py-4">
            {state.screen === 'processing' ? (
              <LoadingState message="Extracting item details…" />
            ) : (
              <>
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
                <p className="text-sm text-muted-foreground text-center">{state.error || 'An error occurred'}</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={goBack} type="button">
                    Back
                  </Button>
                  <Button variant="accent" onClick={retryProcessing} type="button" radius="pill">
                    Try Again
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {state.screen === 'review' && state.definition && reviewedValues && (
          <CatalogueItemReviewScreen
            definition={state.definition}
            values={reviewedValues}
            confidences={state.confidences}
            infoImage={infoImage || null}
            allImages={allImages}
            isSaving={state.isSaving}
            extractedAt={state.extractedAt ?? undefined}
            onFieldChange={handleFieldChange}
            onSave={saveItem}
            onBack={goBack}
          />
        )}

        {state.screen === 'success' && (
          <div className="space-y-4 text-center py-8">
            <p className="font-medium">Item saved to the catalogue.</p>
            <Button
              variant="accent"
              onClick={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
              type="button"
              radius="pill"
            >
              Back to Vendor
            </Button>
          </div>
        )}
      </main>

      <ConfirmationDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleConfirmCancel}
        title="Discard Item?"
        description="You have captured images that will be lost if you cancel. Are you sure?"
        confirmText="Discard"
        cancelText="Keep Editing"
        variant="destructive"
        icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
      />

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
