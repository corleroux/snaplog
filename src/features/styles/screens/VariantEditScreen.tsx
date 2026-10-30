/**
 * Variant Edit Screen Component
 *
 * Allows manual editing of committed variant data.
 *
 * DESIGN ALIGNED:
 * - Premium surfaces with warm orange accent
 * - Clear visual hierarchy and flow progress
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with StyleEditScreen/VendorEditScreen design system
 *
 * NON-NEGOTIABLE RULES:
 * - NO AI extraction during edit
 * - NO re-extraction actions
 * - Editing is fully manual
 * - Inventory updates create new records (time-series, not mutable state)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Palette, Package, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button, AppFrame, AppHeader, BottomActionBar } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { useToast } from '@/components/ui/toast'
import { useDirtyFormGuardRHF } from '@/hooks'
import { getVariant, updateVariant, type VariantUpdate } from '@/features/styles/api/updateVariant'
import { variantEditFormSchema, type VariantEditFormValues } from '@/lib/validation/forms/variantEdit.schema'
import { FormField } from '@/components/ui/form'

type ScreenState = 'loading' | 'loaded' | 'saving' | 'error'

export interface VariantEditScreenProps {
  /** The variant ID to edit (from route params) */
  variantId?: string
  /** The event ID (from route params) */
  eventId?: string
  /** The vendor ID (from route params) */
  vendorId?: string
  /** The style ID (from route params) */
  styleId?: string
  /** Callback for back navigation */
  onBack?: () => void
  /** Callback for successful save */
  onSave?: () => void
  /** Additional className */
  className?: string
}

/**
 * Variant edit screen component
 *
 * Shows:
 * - Header with variant name and back button
 * - Editable form sections for all variant fields
 * - Inventory section (creates new record on update)
 * - Sticky bottom action bar with Save/Cancel buttons
 */
export function VariantEditScreen({
  variantId: propVariantId,
  eventId: propEventId,
  vendorId: propVendorId,
  styleId: propStyleId,
  onBack,
  onSave,
  className,
}: VariantEditScreenProps) {
  const navigate = useNavigate()
  const { eventId: routeEventId = '', vendorId: routeVendorId = '', styleId: routeStyleId = '', variantId: routeVariantId = '' } = useParams()
  const eventId = propEventId || routeEventId
  const vendorId = propVendorId || routeVendorId
  const styleId = propStyleId || routeStyleId
  const variantId = propVariantId || routeVariantId

  const { showToast } = useToast()

  const [screenState, setScreenState] = useState<ScreenState>('loading')
  const [errorMessage, setError] = useState<string | null>(null)
  const [variantVersion, setVariantVersion] = useState<number>(1)

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<VariantEditFormValues>({
    resolver: zodResolver(variantEditFormSchema),
    defaultValues: {
      color_code: '',
      color_name: '',
      variant_name: '',
      wash_code: '',
      finish_override: '',
      quantity: '',
      unit: '',
      batch_no: '',
      stock_status: 'in_stock',
      metadata: '',
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
    message: 'You have unsaved changes to this variant. If you leave, your changes will be lost.',
  })

  // Load variant data on mount
  useEffect(() => {
    const loadVariant = async () => {
      if (!variantId) {
        setError('No variant ID provided')
        setScreenState('error')
        return
      }

      try {
        setScreenState('loading')
        const { variant: loadedVariant, inventory: loadedInventory } = await getVariant(variantId)

        setVariantVersion(loadedVariant.version)
        const formValues: VariantEditFormValues = {
          color_code: loadedVariant.color_code ?? '',
          color_name: loadedVariant.color_name ?? '',
          variant_name: loadedVariant.variant_name ?? '',
          wash_code: loadedVariant.wash_code ?? '',
          finish_override: loadedVariant.finish_override ?? '',
          quantity: loadedInventory?.quantity?.toString() ?? '',
          unit: loadedInventory?.unit ?? '',
          batch_no: loadedInventory?.batch_no ?? '',
          stock_status: (loadedInventory?.stock_status ?? 'in_stock') as VariantEditFormValues['stock_status'],
          metadata: loadedVariant.metadata ? JSON.stringify(loadedVariant.metadata, null, 2) : '',
        }

        reset(formValues)
        setScreenState('loaded')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load variant'
        setError(errorMessage)
        setScreenState('error')
      }
    }

    loadVariant()
  }, [variantId, reset])

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
   * Save edited variant data.
   *
   * Updates the variant row and creates a new inventory record if stock changed.
   * Does NOT modify scan_sessions audit payloads.
   */
  const handleSave = useCallback(async (values: VariantEditFormValues) => {
    if (!variantId) {
      setError('No variant ID provided')
      return
    }

    setScreenState('saving')
    setError(null)

    try {
      // Build update payload
      const updates: VariantUpdate = {
        variantFields: {
          color_code: values.color_code || null,
          color_name: values.color_name || null,
          variant_name: values.variant_name || null,
          wash_code: values.wash_code || null,
          finish_override: values.finish_override || null,
          metadata: values.metadata ? parseMetadata(values.metadata) : null,
        },
      }

      // Only include inventory update if values changed
      if (values.quantity || values.unit || values.batch_no || values.stock_status) {
        updates.inventoryFields = {
          quantity: values.quantity ? parseFloat(values.quantity) : 0,
          unit: values.unit || 'pcs',
          batch_no: values.batch_no || null,
          stock_status: values.stock_status as 'in_stock' | 'low_stock' | 'reserved' | 'sample_only' | 'out_of_stock',
        }
      }

      await updateVariant(variantId, updates, variantVersion)

      // Show success toast
      showToast({
        title: 'Variant saved',
        description: 'Your changes have been saved successfully',
        variant: 'success',
        duration: 3000,
      })

      // Navigate back to style detail after brief delay
      setTimeout(() => {
        if (onSave) {
          onSave()
        } else if (onBack) {
          onBack()
        } else {
          navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`)
        }
      }, 500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update variant'
      setError(errorMessage)
      setScreenState('loaded')

      // Show error toast
      showToast({
        title: 'Save failed',
        description: errorMessage,
        variant: 'error',
        duration: 5000,
      })
    }
  }, [variantId, updateVariant, showToast, navigate, eventId, vendorId, styleId, onSave, onBack])

  // Loading state
  if (screenState === 'loading') {
    return (
      <AppFrame className={cn('flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-muted-foreground">Loading variant data...</p>
        </div>
      </AppFrame>
    )
  }

  // Error state
  if (screenState === 'error') {
    return (
      <AppFrame className={cn('flex items-center justify-center px-4', className)}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">Failed to load variant</h2>
          <p className="text-muted-foreground">{errorMessage || 'Please try again.'}</p>
          <Link to={`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`}>
            <Button variant="outline" radius="pill">
              Back to Style
            </Button>
          </Link>
        </div>
      </AppFrame>
    )
  }

  return (
    <AppFrame className={className}>
      {/* Header */}
      <AppHeader
        title="Edit Variant"
        subtitle="Update variant information"
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
          {/* Color & Finish Section */}
          <SectionContainer
            title="Color & Finish"
            description="Variant identification"
            icon={<Palette className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <FormField
                label="Variant Name"
                error={errors.variant_name?.message}
              >
                <input
                  id="variant_name"
                  placeholder="Navy Blue - Heavy Wash"
                  {...register('variant_name')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Color Name"
                error={errors.color_name?.message}
              >
                <input
                  id="color_name"
                  placeholder="Navy Blue"
                  {...register('color_name')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Color Code"
                error={errors.color_code?.message}
              >
                <input
                  id="color_code"
                  placeholder="NV-001"
                  {...register('color_code')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Wash Code"
                error={errors.wash_code?.message}
              >
                <input
                  id="wash_code"
                  placeholder="W-001"
                  {...register('wash_code')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Finish Override"
                error={errors.finish_override?.message}
              >
                <input
                  id="finish_override"
                  placeholder="Brushed, Enzyme Wash"
                  {...register('finish_override')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>
            </div>
          </SectionContainer>

          {/* Inventory Section */}
          <SectionContainer
            title="Inventory"
            description="Current stock snapshot"
            icon={<Package className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <FormField
                label="Quantity"
                error={errors.quantity?.message}
              >
                <input
                  id="quantity"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="100"
                  {...register('quantity')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Unit"
                error={errors.unit?.message}
              >
                <input
                  id="unit"
                  placeholder="meters, yards, pcs"
                  {...register('unit')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Batch Number"
                error={errors.batch_no?.message}
              >
                <input
                  id="batch_no"
                  placeholder="B-2024-001"
                  {...register('batch_no')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Stock Status"
                error={errors.stock_status?.message}
              >
                <select
                  id="stock_status"
                  {...register('stock_status')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="reserved">Reserved</option>
                  <option value="sample_only">Sample Only</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </FormField>

              {/* Info note about inventory */}
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>Updating inventory creates a new stock snapshot record. Previous inventory records are preserved for history tracking.</span>
                </p>
              </div>
            </div>
          </SectionContainer>

          {/* Metadata Section */}
          <SectionContainer
            title="Metadata"
            description="Additional variant information"
          >
            <div className="space-y-4">
              <FormField
                label="Metadata (JSON)"
                error={errors.metadata?.message}
                hint="Optional JSON metadata for custom fields"
              >
                <textarea
                  id="metadata"
                  placeholder='{"key": "value"}'
                  rows={4}
                  {...register('metadata')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </FormField>
            </div>
          </SectionContainer>
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
