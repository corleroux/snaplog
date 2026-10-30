/**
 * Vendor Review Screen Component
 *
 * Displays the extracted vendor data for review and editing before save.
 *
 * DESIGN ALIGNED:
 * - Premium light surfaces with warm orange accent
 * - Clear visual hierarchy with confidence indicators
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { AlertTriangle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button, BottomActionBar, Badge } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import type { VendorExtractionResult } from '@/types/vendor'
import type { CaptureImage } from '@/types/capture'
import { BasicInfoSection, ContactInfoSection, AdditionalDetailsSection } from '../components/review/VendorReviewFormSections'
import type { VendorFormSectionProps } from '../components/review/VendorReviewFormSections'
import { SourceImagePreview } from '../components/review/VendorReviewImageSection'
import { useVendorReviewForm } from '../components/review/useVendorReviewForm'

type VendorFields = VendorExtractionResult['fields']

export interface VendorReviewScreenProps {
  /** The extraction result from processing */
  extractionResult: VendorExtractionResult
  /** The Info image that was processed */
  infoImage: CaptureImage | null
  /** Whether a save operation is in progress */
  isSaving?: boolean
  /** Callback when user confirms and saves */
  onSave: (data: VendorFields) => void | Promise<void>
  /** Callback when user goes back */
  onBack?: () => void
  /** Optional header content */
  headerContent?: React.ReactNode
  /** Additional className */
  className?: string
}

/**
 * Vendor review screen component
 *
 * Shows:
 * - Source Info image preview
 * - Confidence-aware field indicators
 * - Editable form with all extracted fields
 * - Warnings section if present
 * - Save and back actions
 * - No re-extraction action (by design)
 */
export function VendorReviewScreen({
  extractionResult,
  infoImage,
  isSaving = false,
  onSave,
  onBack,
  headerContent,
  className,
}: VendorReviewScreenProps) {
  const { formData, validationErrors, handleFieldChange, handleSave } =
    useVendorReviewForm(extractionResult)

  const sectionProps: VendorFormSectionProps = {
    formData,
    confidence: extractionResult.confidence,
    onFieldChange: handleFieldChange,
    validationErrors,
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header section */}
      {headerContent || (
        <SectionContainer
          title="Review Vendor Details"
          description="Edit the extracted information before saving"
          background="muted"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="accent" className="gap-1">
              <Sparkles className="h-3 w-3" />
              AI Extracted
            </Badge>
            <Badge variant="outline">
              {new Date(extractionResult.extractedAt).toLocaleTimeString()}
            </Badge>
          </div>
        </SectionContainer>
      )}

      {/* Source image preview */}
      {infoImage && <SourceImagePreview infoImage={infoImage} />}

      {/* Warnings section */}
      {extractionResult.warnings.length > 0 && (
        <SectionContainer
          title="Extraction Warnings"
          background="muted"
        >
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

      {/* Form sections */}
      <BasicInfoSection {...sectionProps} />
      <ContactInfoSection {...sectionProps} />
      <AdditionalDetailsSection {...sectionProps} />

      {/* Action buttons */}
      <BottomActionBar>
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isSaving}
            type="button"
            className="flex-1"
          >
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
          {isSaving ? 'Saving...' : 'Save Vendor'}
        </Button>
      </BottomActionBar>
    </div>
  )
}
