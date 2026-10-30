/**
 * Hook for vendor review form validation and state management
 *
 * Extracted from VendorReviewScreen to reduce its size.
 * Handles form state, field changes, validation, and save logic.
 */

import { useState, useEffect } from 'react'
import { vendorReviewFormSchema } from '@/lib/validation/extraction/vendorExtraction.schema'
import type { VendorExtractionResult } from '@/types/vendor'

type VendorFields = VendorExtractionResult['fields']

/**
 * Map camelCase form keys to snake_case schema keys
 */
function formToSchemaData(formData: VendorFields) {
  return {
    company_name: formData.companyName,
    booth_number: formData.boothNumber,
    contact_person: formData.contactPerson,
    email: formData.email,
    phone: formData.phone,
    website_url: formData.website,
    address: formData.address,
    country_of_origin: formData.countryOfOrigin,
    brand_names: formData.brandNames,
    notes: formData.notes,
  }
}

/**
 * Map snake_case schema key back to camelCase form key
 */
const schemaToFormKey: Record<string, keyof VendorFields> = {
  company_name: 'companyName',
  booth_number: 'boothNumber',
  contact_person: 'contactPerson',
  website_url: 'website',
  country_of_origin: 'countryOfOrigin',
  brand_names: 'brandNames',
}

export interface UseVendorReviewFormReturn {
  formData: VendorFields
  validationErrors: Record<string, string>
  handleFieldChange: (field: string, value: string) => void
  handleSave: (onSave: (data: VendorFields) => void | Promise<void>) => void
}

/**
 * Hook managing the vendor review form state and validation.
 */
export function useVendorReviewForm(
  extractionResult: VendorExtractionResult,
): UseVendorReviewFormReturn {
  const [formData, setFormData] = useState<VendorFields>(extractionResult.fields)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    setFormData(extractionResult.fields)
  }, [extractionResult.fields])

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  const handleSave = (onSave: (data: VendorFields) => void | Promise<void>) => {
    const schemaData = formToSchemaData(formData)
    const result = vendorReviewFormSchema.safeParse(schemaData)

    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const schemaKey = String(issue.path[0])
        const formKey = schemaToFormKey[schemaKey] ?? schemaKey
        if (!errors[formKey]) {
          errors[formKey] = issue.message
        }
      }
      setValidationErrors(errors)
      return
    }

    setValidationErrors({})
    onSave(formData)
  }

  return {
    formData,
    validationErrors,
    handleFieldChange,
    handleSave,
  }
}
