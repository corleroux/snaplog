/**
 * Style Review Screen Component
 *
 * Displays the extracted style data for review and editing before save.
 *
 * IMAGE-LED DESIGN:
 * - Hero image at top (Info image)
 * - Horizontal thumbnail strip below
 * - Scrollable form sections below
 * - Images always visible while editing
 * - Subtle confidence indicators
 */

import { AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button, BottomActionBar, Badge } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import type { StyleExtractionResult } from '@/types/style'
import type { CaptureImage } from '@/types/capture'
import { HeroImage, ThumbnailStrip } from '../components/review/ReviewImageSection'
import {
  StyleIdentitySection,
  MaterialDetailsSection,
  DimensionsSection,
  PricingSection,
  AdditionalInfoSection,
} from '../components/review/ReviewFormSections'
import type { ReviewFormSectionProps } from '../components/review/ReviewFormSections'
import { useStyleReviewForm } from '../components/review/useStyleReviewForm'

type StyleFields = StyleExtractionResult['fields']

export interface StyleReviewScreenProps {
  extractionResult: StyleExtractionResult
  infoImage: CaptureImage | null
  allImages?: CaptureImage[]
  isSaving?: boolean
  duplicateInfo?: { itemCode: string; existingStyle: any } | null
  onSave: (data: StyleFields, heroImageId?: string) => void | Promise<void>
  onConfirmDuplicate?: () => void | Promise<void>
  onBack?: () => void
  headerContent?: React.ReactNode
  className?: string
}

/**
 * Style review screen component
 *
 * IMAGE-LED STRUCTURE:
 * - Hero image (Info image) - always visible
 * - Thumbnail strip (all images)
 * - Scrollable form sections
 * - Extraction warnings if present
 * - No re-extraction action (by design)
 */
export function StyleReviewScreen({
  extractionResult,
  infoImage,
  allImages,
  isSaving = false,
  duplicateInfo = null,
  onSave,
  onConfirmDuplicate,
  onBack,
  headerContent,
  className,
}: StyleReviewScreenProps) {
  const {
    formData,
    validationErrors,
    heroImage,
    setHeroImage,
    handleFieldChange,
    handleSave,
  } = useStyleReviewForm(extractionResult, infoImage)

  const displayImages = allImages || (infoImage ? [infoImage] : [])

  const sectionProps: ReviewFormSectionProps = {
    formData,
    confidence: extractionResult.confidence,
    onFieldChange: handleFieldChange,
    validationErrors,
  }

  return (
    <div className={cn('space-y-4', className)}>
      {headerContent || (
        <SectionContainer
          title="Review Style Details"
          description="Edit the extracted information before saving"
          background="muted"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="accent" className="gap-1 bg-orange-500 text-white text-xs">
              <Sparkles className="h-3 w-3" />
              AI Extracted
            </Badge>
            <Badge variant="outline" className="text-xs">
              {new Date(extractionResult.extractedAt).toLocaleTimeString()}
            </Badge>
          </div>
        </SectionContainer>
      )}

      {heroImage && (
        <HeroImage image={heroImage} isInfoImage={heroImage.id === infoImage?.id} />
      )}

      <ThumbnailStrip
        images={displayImages}
        selectedImageId={heroImage?.id}
        onImageSelect={setHeroImage}
      />

      {duplicateInfo && (
        <SectionContainer
          title="Duplicate Style Detected"
          background="muted"
          icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
        >
          <div className="space-y-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              A style with item code <strong>{duplicateInfo.itemCode}</strong> already exists for this vendor 
              {duplicateInfo.existingStyle?.name && ` (${duplicateInfo.existingStyle.name})`}.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onConfirmDuplicate}
                disabled={isSaving}
                className="bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400"
              >
                Continue Anyway
              </Button>
            </div>
          </div>
        </SectionContainer>
      )}

      {extractionResult.warnings.length > 0 && (
        <SectionContainer title="Extraction Warnings" background="muted">
          <div className="space-y-2">
            {extractionResult.warnings.map((warning, index) => (
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

      <StyleIdentitySection {...sectionProps} />
      <MaterialDetailsSection {...sectionProps} />
      <DimensionsSection {...sectionProps} />
      <PricingSection {...sectionProps} />
      <AdditionalInfoSection {...sectionProps} />

      <BottomActionBar>
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={isSaving} type="button" className="flex-1">
            Back
          </Button>
        )}
        <Button
          variant="accent"
          onClick={() => handleSave(onSave)}
          disabled={isSaving || Object.keys(validationErrors).length > 0}
          loading={isSaving}
          type="button"
          className="flex-1"
          radius="pill"
        >
          {isSaving ? 'Saving...' : 'Save Style'}
        </Button>
      </BottomActionBar>
    </div>
  )
}
