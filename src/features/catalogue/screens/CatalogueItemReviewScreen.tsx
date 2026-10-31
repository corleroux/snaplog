/**
 * Schema-driven item review screen (FR-SCH-05 + FR-EXT-06).
 *
 * Image-led review like the fabric/vendor screens, but every field renders
 * from the catalogue type definition — no per-category form code.
 */

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button, BottomActionBar, Badge } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import type { CaptureImage } from '@/types/capture'
import { HeroImage, ThumbnailStrip } from '@/features/styles/components/review/ReviewImageSection'
import { SchemaReviewForm } from '../components/SchemaReviewForm'
import type { CatalogueTypeDefinition } from '../api/catalogueRegistry'

export interface CatalogueItemReviewScreenProps {
  definition: CatalogueTypeDefinition
  values: Record<string, unknown>
  confidences?: Record<string, number>
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

      {infoImage && <HeroImage image={infoImage} isInfoImage />}

      <ThumbnailStrip
        images={displayImages}
        selectedImageId={infoImage?.id}
        onImageSelect={() => {}}
      />

      <SchemaReviewForm
        fields={definition.schema.fields}
        values={values}
        confidences={confidences}
        onFieldChange={onFieldChange}
        validationErrors={validationErrors}
      />

      <BottomActionBar>
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={isSaving} type="button" className="flex-1">
            Back
          </Button>
        )}
        <Button
          variant="accent"
          onClick={onSave}
          disabled={isSaving || Object.keys(validationErrors).length > 0}
          loading={isSaving}
          type="button"
          className="flex-1"
          radius="pill"
        >
          {isSaving ? 'Saving...' : `Save ${definition.display_name}`}
        </Button>
      </BottomActionBar>
    </div>
  )
}
