/**
 * Vendor Review Form Section Components
 *
 * Extracted from VendorReviewScreen for maintainability.
 * Each section groups related form fields with confidence indicators.
 */

import { Building2, Mail, Phone, Globe, MapPin, User } from 'lucide-react'
import { Textarea } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import { FieldWithConfidenceSimple } from '@/components/review'
import type { ConfidenceLevel } from '@/types/vendor'

/**
 * Shared props for all vendor form sections
 */
export interface VendorFormSectionProps {
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
 * Basic Information Section
 *
 * Contains the primary identification fields:
 * - Company Name (required)
 * - Booth Number
 * - Country of Origin
 * - Brand Names
 */
export function BasicInfoSection({
  formData,
  confidence,
  onFieldChange,
  validationErrors,
}: VendorFormSectionProps) {
  return (
    <SectionContainer
      title="Basic Information"
      icon={<Building2 className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <FieldWithConfidenceSimple
          label="Company Name"
          value={formData.companyName}
          confidence={confidence.companyName}
          onChange={(value) => onFieldChange('companyName', value)}
          icon={Building2}
          required
          placeholder="Enter company name"
          error={validationErrors.companyName}
        />

        <FieldWithConfidenceSimple
          label="Booth Number"
          value={formData.boothNumber}
          confidence={confidence.boothNumber}
          onChange={(value) => onFieldChange('boothNumber', value)}
          placeholder="e.g., A-123"
        />

        <FieldWithConfidenceSimple
          label="Country of Origin"
          value={formData.countryOfOrigin}
          confidence={confidence.address}
          onChange={(value) => onFieldChange('countryOfOrigin', value)}
          icon={MapPin}
          placeholder="Enter country"
        />

        <FieldWithConfidenceSimple
          label="Brand Names"
          value={formData.brandNames}
          onChange={(value) => onFieldChange('brandNames', value)}
          placeholder="Separate multiple brands with commas"
        />
      </div>
    </SectionContainer>
  )
}

/**
 * Contact Information Section
 *
 * Contains contact-related fields:
 * - Contact Person
 * - Email
 * - Phone
 */
export function ContactInfoSection({
  formData,
  confidence,
  onFieldChange,
  validationErrors,
}: VendorFormSectionProps) {
  return (
    <SectionContainer
      title="Contact Information"
      icon={<User className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <FieldWithConfidenceSimple
          label="Contact Person"
          value={formData.contactPerson}
          confidence={confidence.contactPerson}
          onChange={(value) => onFieldChange('contactPerson', value)}
          icon={User}
          placeholder="Primary contact name"
          error={validationErrors.contactPerson}
        />

        <FieldWithConfidenceSimple
          label="Email"
          value={formData.email}
          confidence={confidence.email}
          onChange={(value) => onFieldChange('email', value)}
          icon={Mail}
          type="email"
          placeholder="email@company.com"
          error={validationErrors.email}
        />

        <FieldWithConfidenceSimple
          label="Phone"
          value={formData.phone}
          confidence={confidence.phone}
          onChange={(value) => onFieldChange('phone', value)}
          icon={Phone}
          type="tel"
          placeholder="+1 234 567 8900"
          error={validationErrors.phone}
        />
      </div>
    </SectionContainer>
  )
}

/**
 * Additional Details Section
 *
 * Contains supplementary fields:
 * - Website
 * - Address
 * - Notes
 */
export function AdditionalDetailsSection({
  formData,
  confidence,
  onFieldChange,
  validationErrors,
}: VendorFormSectionProps) {
  return (
    <SectionContainer
      title="Additional Details"
    >
      <div className="space-y-4">
        <FieldWithConfidenceSimple
          label="Website"
          value={formData.website}
          confidence={confidence.website}
          onChange={(value) => onFieldChange('website', value)}
          icon={Globe}
          type="url"
          placeholder="https://company.com"
          error={validationErrors.website}
        />

        <FieldWithConfidenceSimple
          label="Address"
          value={formData.address}
          confidence={confidence.address}
          onChange={(value) => onFieldChange('address', value)}
          icon={MapPin}
          multiline
          placeholder="Full street address"
          error={validationErrors.address}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => onFieldChange('notes', e.target.value)}
            placeholder="Additional notes about this vendor..."
            rows={3}
          />
        </div>
      </div>
    </SectionContainer>
  )
}
