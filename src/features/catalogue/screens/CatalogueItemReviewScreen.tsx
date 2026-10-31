/**
 * Schema-driven item review screen (FR-SCH-05 + FR-EXT-06).
 *
 * Image-led review like the fabric/vendor screens, but every field renders
 * from the catalogue type definition — no per-category form code.
 */

import { useEffect, useState } from 'react'
import { Sparkles, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button, BottomActionBar, Badge } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import { EmptyState } from '@/components/ui/EmptyState'
import type { CaptureImage } from '@/types/capture'
import { HeroImage, ThumbnailStrip } from '@/features/styles/components/review/ReviewImageSection'
import { SchemaReviewForm } from '../components/SchemaReviewForm'
import type { CatalogueTypeDefinition } from '../api/catalogueRegistry'

export interface CatalogueItemReviewScreenProps {
  definition: CatalogueTypeDefinition
  values: Record<string, unknown>
  confidences?: Record<string, number>
  warnings?: string[]
  infoImage: CaptureImage | null
  allImages?: CaptureImage[]
  isSaving?: boolean
  extractedAt?: string
  validationErrors?: Record<string, string>
  onFieldChange: (path: string, value: unknown) => void
  onSave: () => void | Promise<void>
  onBack?: () => void
  headerContent?: React.ReactNode
  className?: string
}

export function CatalogueItemReviewScreen({
  definition,
  values,
  confidences,
  warnings = [],
  infoImage,
  allImages,
  isSaving = false,
  extractedAt,
  validationErrors = {},
  onFieldChange,
  onSave,
  onBack,
  headerContent,
  className,
}: CatalogueItemReviewScreenProps) {
  const displayImages = allImages || (infoImage ? [infoImage] : [])
  const [heroImage, setHeroImage] = useState<CaptureImage | null>(infoImage)

  // Keep the hero in sync when new extraction results arrive (extraction
  // completes after capture, so infoImage is set after first render).
  useEffect(() => {
    setHeroImage((prev) => {
      if (infoImage) {return infoImage}
      if (!prev) {return prev}
      const stillThere = displayImages.some((img) => img.id === prev.id)
      return stillThere ? prev : (displayImages[0] ?? null)
    })
  }, [infoImage, displayImages])

  return (
    <div className={cn('space-y-4', className)}>
      {headerContent || (
        <SectionContainer
          title={`Review ${definition.display_name} Details`}
          description="Edit the extracted information before saving"
          background="muted"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="accent" className="gap-1 bg-orange-500 text-white text-xs">
              <Sparkles className="h-3 w-3" />
              AI Extracted
            </Badge>
            <Badge variant="outline" className="text-xs">
              {definition.display_name} v{definition.version}
            </Badge>
            {extractedAt && (
              <Badge variant="outline" className="text-xs">
                {new Date(extractedAt).toLocaleTimeString()}
              </Badge>
            )}
          </div>
        </SectionContainer>
      )}

      {heroImage ? (
        <HeroImage image={heroImage} isInfoImage={heroImage.id === infoImage?.id} />
      ) : (
        <EmptyState
          variant="inline"
          title="No capture image"
          description="Retake the photo so you can verify fields against the original."
        />
      )}

      <ThumbnailStrip
        images={displayImages}
        selectedImageId={heroImage?.id}
        onImageSelect={setHeroImage}
      />

      {warnings.length > 0 && (
        <SectionContainer title="Extraction Warnings" background="muted">
          <div className="space-y-2">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">{warning}</p>
              </div>
            ))}
          </div>
        </SectionContainer>
      )}

      <SchemaReviewForm
        fields={definition.schema.fields}
        values={values}
        confidences={confidences}
        onFieldChange={onFieldChange}
        validationErrors={validationErrors}
      />

      <BottomActionBar>
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={isSaving} type="button" className="flex-1 min-h-[44px]">
            Back
          </Button>
        )}
        <Button
          variant="accent"
          onClick={onSave}
          disabled={isSaving || Object.keys(validationErrors).length > 0}
          loading={isSaving}
          type="button"
          className="flex-1 min-h-[44px]"
          radius="pill"
        >
          {isSaving ? 'Saving...' : `Save ${definition.display_name}`}
        </Button>
      </BottomActionBar>
    </div>
  )
}
