/**
 * Style Review Form Section Components
 *
 * Extracted from StyleReviewScreen for maintainability.
 * Each section groups related form fields with confidence indicators.
 */

import { Package, Ruler, Palette, DollarSign } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { FieldWithConfidenceSimple } from '@/components/review'
import type { ConfidenceLevel } from '@/types/review'

/**
 * Shared props for all form sections
 */
export interface ReviewFormSectionProps {
  /** Current form field values */
  formData: Record<string, string>
  /** Per-field confidence levels from extraction */
  confidence: Record<string, ConfidenceLevel | undefined>
  /** Callback when any field value changes */
  onFieldChange: (field: string, value: string) => void
  /** Validation errors keyed by field name */
  validationErrors: Record<string, string>
}

/**
 * Style Identity Section
 *
 * Contains the primary identification fields:
 * - Style Name
 * - Item Code (required)
 */
export function StyleIdentitySection({
  formData,
  confidence,
  onFieldChange,
  validationErrors,
}: ReviewFormSectionProps) {
  return (
    <SectionContainer
      title="Style Identity"
      icon={<Package className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <FieldWithConfidenceSimple
          label="Style Name"
          value={formData.name}
          confidence={confidence.name}
          onChange={(value) => onFieldChange('name', value)}
          icon={Package}
          placeholder="Enter style name"
        />

        <FieldWithConfidenceSimple
          label="Item Code"
          value={formData.itemCode}
          confidence={confidence.itemCode}
          onChange={(value) => onFieldChange('itemCode', value)}
          placeholder="e.g., FAB-001"
          required
          error={validationErrors.itemCode}
        />
      </div>
    </SectionContainer>
  )
}

/**
 * Material Details Section
 *
 * Contains fabric composition and categorization fields:
 * - Composition
 * - Category
 * - Construction
 * - Finish
 * - Pattern
 */
export function MaterialDetailsSection({
  formData,
  confidence,
  onFieldChange,
}: ReviewFormSectionProps) {
  return (
    <SectionContainer
      title="Material Details"
      icon={<Ruler className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <FieldWithConfidenceSimple
          label="Composition"
          value={formData.composition}
          confidence={confidence.composition}
          onChange={(value) => onFieldChange('composition', value)}
          placeholder="e.g., 100% Cotton"
        />

        <FieldWithConfidenceSimple
          label="Category"
          value={formData.category}
          onChange={(value) => onFieldChange('category', value)}
          placeholder="e.g., Denim"
        />

        <FieldWithConfidenceSimple
          label="Construction"
          value={formData.construction}
          onChange={(value) => onFieldChange('construction', value)}
          placeholder="e.g., Plain weave"
        />

        <FieldWithConfidenceSimple
          label="Finish"
          value={formData.finish}
          onChange={(value) => onFieldChange('finish', value)}
          placeholder="e.g., Stone washed"
        />

        <FieldWithConfidenceSimple
          label="Pattern"
          value={formData.pattern}
          onChange={(value) => onFieldChange('pattern', value)}
          placeholder="e.g., Solid, Stripe"
        />
      </div>
    </SectionContainer>
  )
}

/**
 * Dimensions Section
 *
 * Contains physical measurement fields:
 * - Width (cm)
 * - Width (in)
 * - Weight (gsm)
 * - Weight (oz/yd^2)
 */
export function DimensionsSection({
  formData,
  onFieldChange,
}: ReviewFormSectionProps) {
  return (
    <SectionContainer
      title="Dimensions"
      icon={<Ruler className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <FieldWithConfidenceSimple
          label="Width (cm)"
          value={formData.widthCm}
          onChange={(value) => onFieldChange('widthCm', value)}
          placeholder="e.g., 150"
        />

        <FieldWithConfidenceSimple
          label="Width (in)"
          value={formData.widthIn}
          onChange={(value) => onFieldChange('widthIn', value)}
          placeholder="e.g., 59"
        />

        <FieldWithConfidenceSimple
          label="Weight (gsm)"
          value={formData.weightGsm}
          onChange={(value) => onFieldChange('weightGsm', value)}
          placeholder="e.g., 200"
        />

        <FieldWithConfidenceSimple
          label="Weight (oz/yd\u00B2)"
          value={formData.weightOzsy}
          onChange={(value) => onFieldChange('weightOzsy', value)}
          placeholder="e.g., 6.0"
        />
      </div>
    </SectionContainer>
  )
}

/**
 * Pricing Section
 *
 * Contains pricing fields:
 * - Currency (dropdown)
 * - Price (number input with confidence)
 * - Price Unit (dropdown)
 */
export function PricingSection({
  formData,
  confidence,
  onFieldChange,
  validationErrors,
}: ReviewFormSectionProps) {
  return (
    <SectionContainer
      title="Pricing"
      icon={<DollarSign className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {/* Price Row - Currency, Price, Unit */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Currency</label>
            <select
              value={formData.currency || 'USD'}
              onChange={(e) => onFieldChange('currency', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CNY">CNY</option>
            </select>
          </div>

          <FieldWithConfidenceSimple
            label="Price"
            value={formData.price}
            confidence={confidence.price}
            onChange={(value) => onFieldChange('price', value)}
            placeholder="0.00"
            error={validationErrors.price}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Unit</label>
            <select
              value={formData.priceUnit || 'yard'}
              onChange={(e) => onFieldChange('priceUnit', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="yard">Per Yard</option>
              <option value="meter">Per Meter</option>
              <option value="kg">Per Kg</option>
            </select>
          </div>
        </div>
      </div>
    </SectionContainer>
  )
}

/**
 * Additional Info Section
 *
 * Contains supplementary fields:
 * - Season
 */
export function AdditionalInfoSection({
  formData,
  onFieldChange,
}: ReviewFormSectionProps) {
  return (
    <SectionContainer
      title="Additional Info"
      icon={<Palette className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <FieldWithConfidenceSimple
          label="Season"
          value={formData.season}
          onChange={(value) => onFieldChange('season', value)}
          placeholder="e.g., SS24, AW24"
        />
      </div>
    </SectionContainer>
  )
}
