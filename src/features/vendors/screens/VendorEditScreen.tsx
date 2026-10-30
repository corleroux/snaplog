import { useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, User, AlertTriangle, Loader2, Sparkles } from 'lucide-react'
import { Button, AppFrame, BottomActionBar, Badge } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { useToast } from '@/components/ui/toast'
import { useDirtyFormGuardRHF } from '@/hooks'
import { useUpdateVendor } from '@/features/vendors/hooks/useVendorMutations'
import type { VendorUpdateInput } from '@/features/vendors/api/vendorRepositoryContext'
import type { VendorRecord } from '@/types/vendor'
import { vendorEditFormSchema, type VendorEditFormValues } from '@/lib/validation/forms/vendorEdit.schema'
import { ExtractionInfoPanel } from '../components/ExtractionInfoPanel'
import { VendorImagesSection } from '../components/VendorImagesSection'
import { FormField } from '@/components/ui/form'
import { PageHeader } from '@/components/layout/PageHeader'
import { uploadCaptureImage, deleteCaptureImage } from '@/lib/upload/imageUpload'
import { createScanSession } from '@/lib/scanSession/scanSessionService'
import { extractVendorDocument } from '@/features/vendors/api/extractVendorDocument'
import { toCamelCase } from '@/utils/caseMapping'
import type { ExtractedVendorDocument } from '@/features/vendors/types/vendorExtraction'


export interface VendorEditScreenProps {
  vendor: VendorRecord
  vendorId?: string
  eventId?: string
  onBack?: () => void
  onSave?: () => void
  className?: string
}

function extractToEditFormFields(document: ExtractedVendorDocument): VendorEditFormValues {
  const camel = toCamelCase(document) as unknown as Record<string, unknown>
  const { websiteUrl, brandNames, whatsapp, ...rest } = camel
  return {
    company_name: String(rest.companyName ?? ''),
    booth_number: String(rest.boothNumber ?? ''),
    contact_person: String(rest.contactPerson ?? ''),
    email: String(rest.email ?? ''),
    phone: String(rest.phone ?? ''),
    website_url: String(websiteUrl ?? ''),
    address: String(rest.address ?? ''),
    country_of_origin: String(rest.countryOfOrigin ?? ''),
    brand_names: Array.isArray(brandNames) ? brandNames.join(', ') : '',
    notes: String(rest.notes ?? ''),
  }
}

export function VendorEditScreen({
  vendor,
  vendorId: propVendorId,
  eventId: propEventId,
  onBack,
  onSave,
  className,
}: VendorEditScreenProps) {
  const navigate = useNavigate()
  const { eventId: routeEventId = '', vendorId: routeVendorId = '' } = useParams()
  const eventId = propEventId || routeEventId
  const vendorId = propVendorId || routeVendorId

  const updateMutation = useUpdateVendor(eventId, vendorId)
  const { showToast } = useToast()

  const [screenState, setScreenState] = useState<'loaded' | 'saving'>('loaded')
  const [errorMessage, setError] = useState<string | null>(null)
  const [images, setImages] = useState<VendorRecord['images']>(() => [...vendor.images])

  const [isExtractionEnabled, setIsExtractionEnabled] = useState(true)
  const [isProcessingReplacement, setIsProcessingReplacement] = useState(false)
  const [replaceError, setReplaceError] = useState<string | null>(null)
  const [extractionResultMeta, setExtractionResultMeta] = useState<{
    extractedAt: string
    warnings: string[]
  } | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<VendorEditFormValues>({
    resolver: zodResolver(vendorEditFormSchema),
    defaultValues: {
      company_name: vendor.companyName || '',
      booth_number: vendor.boothNumber || '',
      contact_person: vendor.contactName || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website_url: vendor.website || '',
      address: vendor.address || '',
      country_of_origin: vendor.countryOfOrigin || '',
      brand_names: vendor.brandNames || '',
      notes: vendor.notes || '',
    },
  })

  const dirtyGuard = useDirtyFormGuardRHF({
    isDirty,
    onConfirm: () => {
      if (onBack) {
        onBack()
      } else {
        navigate(`/events/${eventId}/vendors/${vendorId}`)
      }
    },
    title: 'Discard changes?',
    message: 'You have unsaved changes to this vendor. If you leave, your changes will be lost.',
  })

  const handleReplaceImage = useCallback(async (file: File, extractionEnabled: boolean) => {
    setIsProcessingReplacement(true)
    setReplaceError(null)
    setExtractionResultMeta(null)

    const blobUrl = URL.createObjectURL(file)

    try {
      const uploadResult = await uploadCaptureImage(blobUrl, {
        eventId,
      })

      if (extractionEnabled) {
        const scanSessionId = await createScanSession({
          eventId,
          scanType: 'vendor_card',
          sourceImagePath: uploadResult.storagePath,
          sourceImageUrl: uploadResult.publicUrl,
        })

        const extractionResult = await extractVendorDocument({
          scanSessionId,
          eventId,
          storagePath: uploadResult.storagePath,
          mimeType: uploadResult.mimeType,
          scanType: 'vendor_card',
        })

        const formFields = extractToEditFormFields(extractionResult.document)

        setExtractionResultMeta({
          extractedAt: new Date().toISOString(),
          warnings: [],
        })

        if (!formFields.booth_number && vendor.boothNumber) {
          formFields.booth_number = vendor.boothNumber
        }

        reset(formFields)
      }

      if (images[0]?.storagePath) {
        await deleteCaptureImage(images[0].storagePath)
      }

      const newImageRecord = {
        id: crypto.randomUUID(),
        uri: uploadResult.publicUrl,
        storagePath: uploadResult.storagePath,
      }
      setImages([newImageRecord])

      showToast({
        title: extractionEnabled ? 'Image replaced & extracted' : 'Image replaced',
        description: extractionEnabled
          ? 'Vendor fields have been updated with extracted data. Review and save.'
          : 'The vendor image has been updated.',
        variant: 'success',
        duration: 3000,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process image replacement'
      setReplaceError(message)
      showToast({
        title: 'Replacement failed',
        description: message,
        variant: 'error',
        duration: 5000,
      })
    } finally {
      URL.revokeObjectURL(blobUrl)
      setIsProcessingReplacement(false)
    }
  }, [eventId, vendor, images, reset, showToast])

  const handleSave = useCallback(async (values: VendorEditFormValues) => {
    setScreenState('saving')
    setError(null)

    try {
      const updates: VendorUpdateInput = {
        companyName: values.company_name,
        boothNumber: values.booth_number || '',
        contactName: values.contact_person || '',
        email: values.email || '',
        phone: values.phone || '',
        website: values.website_url || '',
        address: values.address || '',
        countryOfOrigin: values.country_of_origin || '',
        brandNames: values.brand_names || '',
        notes: values.notes || '',
        images: images,
      }

      await updateMutation.mutateAsync({ input: updates, version: vendor.version })

      showToast({
        title: 'Vendor saved',
        description: 'Your changes have been saved successfully',
        variant: 'success',
        duration: 3000,
      })

      setTimeout(() => {
        if (onSave) {
          onSave()
        } else if (onBack) {
          onBack()
        } else {
          navigate(`/events/${eventId}/vendors/${vendorId}`)
        }
      }, 500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update vendor'
      setError(message)
      setScreenState('loaded')

      showToast({
        title: 'Save failed',
        description: message,
        variant: 'error',
        duration: 5000,
      })
    }
  }, [vendor, images, updateMutation, showToast, navigate, eventId, vendorId, onSave, onBack])

  const sourceImage = vendor.images.find((img) => img.id === vendor.sourceInfoImageId)

  return (
    <AppFrame className={className}>
      <PageHeader
        title="Edit Vendor"
        subtitle="Update vendor information"
        onClose={() => {
          if (dirtyGuard.isDirty) {
            dirtyGuard.handleNavigateAway()
          } else {
            if (onBack) {
              onBack()
            } else {
              navigate(`/events/${eventId}/vendors/${vendorId}`)
            }
          }
        }}
      />

      <main className="px-4 py-6 pb-safe-offset space-y-6">
        {errorMessage && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          <VendorImagesSection
            images={images}
            eventId={eventId}
            extractionEnabled={isExtractionEnabled}
            onExtractionToggle={setIsExtractionEnabled}
            onReplace={handleReplaceImage}
            isUploading={isProcessingReplacement}
            uploadError={replaceError}
          />

          {extractionResultMeta && (
            <SectionContainer
              title="AI Extraction Complete"
              description="Values have been updated from the new image"
              background="muted"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="accent" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  AI Extracted
                </Badge>
                <Badge variant="outline">
                  {new Date(extractionResultMeta.extractedAt).toLocaleTimeString()}
                </Badge>
              </div>
              {extractionResultMeta.warnings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {extractionResultMeta.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-700">{w}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionContainer>
          )}

          {vendor?.extractionMeta && !extractionResultMeta && (
            <ExtractionInfoPanel
              extractionMeta={vendor.extractionMeta}
              sourceImage={sourceImage}
            />
          )}

          <SectionContainer
            title="Vendor Identity"
            description="Basic vendor information"
            icon={<Building2 className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <FormField
                label="Company Name"
                required
                error={errors.company_name?.message}
              >
                <input
                  id="company_name"
                  placeholder="Textile Fabrics Ltd."
                  {...register('company_name')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Booth Number"
                error={errors.booth_number?.message}
              >
                <input
                  id="booth_number"
                  placeholder="A-123"
                  {...register('booth_number')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>
            </div>
          </SectionContainer>

          <SectionContainer
            title="Contact Information"
            description="How to reach this vendor"
            icon={<User className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <FormField
                label="Contact Name"
                error={errors.contact_person?.message}
              >
                <input
                  id="contact_person"
                  placeholder="John Smith"
                  {...register('contact_person')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Email"
                error={errors.email?.message}
              >
                <input
                  id="email"
                  type="email"
                  placeholder="john@textilefabrics.com"
                  {...register('email')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Phone"
                error={errors.phone?.message}
              >
                <input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  {...register('phone')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>
            </div>
          </SectionContainer>

          <SectionContainer
            title="Business Information"
            description="Additional business details"
            icon={<Building2 className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <FormField
                label="Website"
                error={errors.website_url?.message}
              >
                <input
                  id="website_url"
                  type="url"
                  placeholder="https://textilefabrics.com"
                  {...register('website_url')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Address"
                error={errors.address?.message}
              >
                <textarea
                  id="address"
                  placeholder="123 Fashion Avenue, New York, NY 10001"
                  {...register('address')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </FormField>

              <FormField
                label="Country of Origin"
                error={errors.country_of_origin?.message}
              >
                <input
                  id="country_of_origin"
                  placeholder="United States"
                  {...register('country_of_origin')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>
            </div>
          </SectionContainer>

          <SectionContainer
            title="Additional Information"
            description="Other relevant details"
          >
            <div className="space-y-4">
              <FormField
                label="Brand Names"
                error={errors.brand_names?.message}
                hint="Separate multiple brands with commas"
              >
                <input
                  id="brand_names"
                  placeholder="Brand A, Brand B, Brand C"
                  {...register('brand_names')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormField>

              <FormField
                label="Notes"
                error={errors.notes?.message}
              >
                <textarea
                  id="notes"
                  placeholder="Specializes in organic cotton and sustainable materials"
                  rows={3}
                  {...register('notes')}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </FormField>
            </div>
          </SectionContainer>
        </form>
      </main>

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
