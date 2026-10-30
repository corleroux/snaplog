/**
 * Style Edit Screen Component
 *
 * Allows manual editing of committed style data.
 *
 * DESIGN ALIGNED:
 * - Premium surfaces with warm orange accent
 * - Clear visual hierarchy and flow progress
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with StyleCaptureFlow/VendorEditScreen design system
 *
 * NON-NEGOTIABLE RULES:
 * - NO AI extraction during edit
 * - NO re-extraction actions
 * - NO Info/Gallery classification workflow
 * - Images are simple reference images only
 * - Extraction context is read-only
 * - Editing is fully manual
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button, AppFrame, AppHeader, BottomActionBar } from '@/components/ui'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { useToast } from '@/components/ui/toast'
import { useDirtyFormGuardRHF } from '@/hooks'
import { useStyleDetail } from '@/features/styles/hooks/useStyleDetail'
import { updateStyle, type StyleUpdate } from '@/features/styles/api/updateStyle'
import { addPriceHistory } from '@/features/styles/api/addPriceHistory'
import { styleEditFormSchema, type StyleEditFormValues } from '@/lib/validation/forms/styleEdit.schema'
import { ExtractionPanel } from '../components/edit/ExtractionPanel'
import { StyleIdentificationSection } from '../components/edit/StyleIdentificationSection'
import { StyleCategorizationSection } from '../components/edit/StyleCategorizationSection'
import { StyleMeasurementsSection } from '../components/edit/StyleMeasurementsSection'
import { StylePricingSection } from '../components/edit/StylePricingSection'
import { StyleAdditionalInfoSection } from '../components/edit/StyleAdditionalInfoSection'

type ScreenState = 'loading' | 'loaded' | 'saving' | 'error'

export interface StyleEditScreenProps {
  /** The style ID to edit (from route params) */
  styleId?: string
  /** The event ID (from route params) */
  eventId?: string
  /** The vendor ID (from route params) */
  vendorId?: string
  /** Callback for back navigation */
  onBack?: () => void
  /** Callback for successful save */
  onSave?: () => void
  /** Additional className */
  className?: string
}

/**
 * Style edit screen component
 *
 * Shows:
 * - Header with style name and back button
 * - Locked extraction panel (if extraction metadata exists)
 * - Editable form sections for all style fields
 * - Sticky bottom action bar with Save/Cancel buttons
 */
export function StyleEditScreen({
  styleId: propStyleId,
  eventId: propEventId,
  vendorId: propVendorId,
  onBack,
  onSave,
  className,
}: StyleEditScreenProps) {
  const navigate = useNavigate()
  const { eventId: routeEventId = '', vendorId: routeVendorId = '', styleId: routeStyleId = '' } = useParams()
  const eventId = propEventId || routeEventId
  const vendorId = propVendorId || routeVendorId
  const styleId = propStyleId || routeStyleId

  const { data, loading: dataLoading, error: dataError, refresh } = useStyleDetail(styleId)
  const { showToast } = useToast()

  const [screenState, setScreenState] = useState<ScreenState>('loading')
  const [errorMessage, setError] = useState<string | null>(null)
  const [styleVersion, setStyleVersion] = useState<number>(1)

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<StyleEditFormValues>({
    resolver: zodResolver(styleEditFormSchema),
    defaultValues: {
      item_code: '',
      name: '',
      composition: '',
      category: '',
      construction: '',
      finish: '',
      width_cm: '',
      width_in: '',
      weight_gsm: '',
      weight_ozsy: '',
      pattern: '',
      season: '',
      metadata: '',
      currency: 'USD',
      price: '',
      price_unit: 'yard',
      minimum_order_quantity: '',
      minimum_order_unit: '',
      lead_time_value: '',
      lead_time_unit: '',
      price_notes: '',
    },
  })

  // Use shared dirty form guard for unsaved changes protection
  const dirtyGuard = useDirtyFormGuardRHF({
    isDirty,
    onConfirm: () => {
      if (onBack) {
        onBack()
      } else {
        navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`)
      }
    },
    title: 'Discard changes?',
    message: 'You have unsaved changes to this style. If you leave, your changes will be lost.',
  })

  // Load style data when data is available
  useEffect(() => {
    if (dataLoading) {
      setScreenState('loading')
      return
    }

    if (dataError) {
      setScreenState('error')
      setError(dataError)
      return
    }

    if (!data || !data.style) {
      setScreenState('error')
      setError('Style not found')
      return
    }

    const style = data.style
    setStyleVersion(style.version)
    const formValues: StyleEditFormValues = {
      item_code: style.item_code ?? '',
      name: style.name ?? '',
      composition: style.composition ?? '',
      category: style.category ?? '',
      construction: style.construction ?? '',
      finish: style.finish ?? '',
      width_cm: style.width_cm?.toString() ?? '',
      width_in: style.width_in?.toString() ?? '',
      weight_gsm: style.weight_gsm?.toString() ?? '',
      weight_ozsy: style.weight_ozsy?.toString() ?? '',
      pattern: style.pattern ?? '',
      season: style.season ?? '',
      metadata: style.metadata ? JSON.stringify(style.metadata, null, 2) : '',
    }

    // Load most recent price if available
    const mostRecentPrice = data?.prices?.[0]
    if (mostRecentPrice) {
      formValues.currency = mostRecentPrice.currency as 'USD' | 'EUR' | 'CNY'
      formValues.price = mostRecentPrice.price.toString()
      formValues.price_unit = mostRecentPrice.price_unit as 'yard' | 'meter' | 'kg'
      formValues.minimum_order_quantity = mostRecentPrice.minimum_order_quantity?.toString() ?? ''
      formValues.minimum_order_unit = mostRecentPrice.minimum_order_unit ?? ''
      formValues.lead_time_value = mostRecentPrice.lead_time_value?.toString() ?? ''
      formValues.lead_time_unit = mostRecentPrice.lead_time_unit ?? ''
      formValues.price_notes = mostRecentPrice.notes ?? ''
    }
    reset(formValues)
    setScreenState('loaded')
  }, [data, dataLoading, dataError, reset])

  /**
   * Parse metadata JSON string.
   */
  const parseMetadata = (value: string): Record<string, unknown> | null => {
    if (!value.trim()) return null
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  /**
   * Save edited style data.
   *
   * Updates the style row only.
   * Does NOT modify scan_sessions audit payloads.
   */
  const handleSave = useCallback(async (values: StyleEditFormValues) => {
    if (!styleId) {
      setError('No style ID provided')
      return
    }

    setScreenState('saving')
    setError(null)

    try {
      const updates: StyleUpdate = {
        item_code: values.item_code || '',
        name: values.name || null,
        composition: values.composition || null,
        category: values.category || null,
        construction: values.construction || null,
        finish: values.finish || null,
        width_cm: values.width_cm ? parseFloat(values.width_cm) || null : null,
        width_in: values.width_in ? parseFloat(values.width_in) || null : null,
        weight_gsm: values.weight_gsm ? parseFloat(values.weight_gsm) || null : null,
        weight_ozsy: values.weight_ozsy ? parseFloat(values.weight_ozsy) || null : null,
        pattern: values.pattern || null,
        season: values.season || null,
        metadata: values.metadata ? parseMetadata(values.metadata) : null,
      }

      await updateStyle(styleId, updates, styleVersion)

      // Save pricing if provided
      const priceValue = values.price ? parseFloat(values.price) : 0
      if (priceValue > 0 && values.currency && values.price_unit) {
        await addPriceHistory({
          style_id: styleId,
          event_id: eventId,
          vendor_id: vendorId,
          currency: values.currency,
          price: priceValue,
          price_unit: values.price_unit,
          minimum_order_quantity: values.minimum_order_quantity ? parseFloat(values.minimum_order_quantity) : null,
          minimum_order_unit: values.minimum_order_unit || null,
          lead_time_value: values.lead_time_value ? parseInt(values.lead_time_value) : null,
          lead_time_unit: values.lead_time_unit || null,
          notes: values.price_notes || null,
        })
      }

      showToast({
        title: 'Style saved',
        description: 'Your changes have been saved successfully',
        variant: 'success',
        duration: 3000,
      })

      setTimeout(() => {
        if (onSave) {
          onSave()
        } else {
          navigate(`/events/${eventId}/vendors/${vendorId}/styles`)
        }
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update style'
      setError(errorMessage)
      setScreenState('loaded')

      showToast({
        title: 'Save failed',
        description: errorMessage,
        variant: 'error',
        duration: 5000,
      })
    }
  }, [styleId, updateStyle, showToast, navigate, eventId, vendorId, onSave, onBack])

  // Loading state
  if (screenState === 'loading' || dataLoading) {
    return (
      <AppFrame className={cn('flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-muted-foreground">Loading style data...</p>
        </div>
      </AppFrame>
    )
  }

  // Error state
  if (screenState === 'error' || dataError) {
    return (
      <AppFrame className={cn('flex items-center justify-center px-4', className)}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">Failed to load style</h2>
          <p className="text-muted-foreground">{errorMessage || dataError || 'Please try again.'}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={refresh} variant="outline" radius="pill">
              Retry
            </Button>
            <Link to={`/events/${eventId}/vendors/${vendorId}/styles`}>
              <Button variant="ghost" radius="pill">
                Back to Styles
              </Button>
            </Link>
          </div>
        </div>
      </AppFrame>
    )
  }

  const style = data?.style

  return (
    <AppFrame className={className}>
      {/* Header */}
      <AppHeader
        title="Edit Style"
        subtitle="Update style information"
        rightAction={
          <Link
            to={dirtyGuard.isShowingConfirmation ? '#' : `/events/${eventId}/vendors/${vendorId}/styles/${styleId}`}
            onClick={(e) => {
              if (dirtyGuard.isDirty) {
                e.preventDefault()
                dirtyGuard.handleNavigateAway()
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </Link>
        }
      />

      {/* Main content */}
      <main className="px-4 py-6 pb-safe-offset space-y-6">
        {/* Error display */}
        {errorMessage && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          {/* Locked Extraction Panel (only if extraction metadata exists) */}
          {style?.extracted_at && (
            <ExtractionPanel
              extractedAt={style.extracted_at}
              extractionWarnings={style.extraction_warnings}
            />
          )}

          {/* Form Sections */}
          <StyleIdentificationSection register={register} errors={errors} />
          <StyleCategorizationSection register={register} errors={errors} />
          <StyleMeasurementsSection register={register} errors={errors} />
          <StylePricingSection register={register} errors={errors} />
          <StyleAdditionalInfoSection register={register} errors={errors} />
        </form>
      </main>

      {/* Sticky bottom action bar */}
      <BottomActionBar>
        <Button
          type="button"
          variant="outline"
          onClick={dirtyGuard.handleNavigateAway}
          disabled={screenState === 'saving'}
          className="flex-1"
          radius="pill"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="accent"
          onClick={handleSubmit(handleSave)}
          disabled={screenState === 'saving' || !isDirty}
          className="flex-1"
          radius="pill"
        >
          {screenState === 'saving' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </Button>
      </BottomActionBar>

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dirtyGuard.isShowingConfirmation}
        onClose={dirtyGuard.cancelNavigation}
        onConfirm={dirtyGuard.confirmNavigation}
        title={dirtyGuard.dialogTitle}
        description={dirtyGuard.dialogMessage}
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="destructive"
        icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
      />
    </AppFrame>
  )
}
