/**
 * Hook for style review form validation and state management
 *
 * Extracted from StyleReviewScreen to reduce its size.
 * Handles form state, field changes, validation, and save logic.
 */

import { useState, useEffect } from 'react'
import { styleReviewFormSchema } from '@/lib/validation/extraction/fabricExtraction.schema'
import type { StyleExtractionResult } from '@/types/style'
import type { CaptureImage } from '@/types/capture'

type StyleFields = StyleExtractionResult['fields']

/**
 * Map camelCase form keys to snake_case schema keys
 */
function formToSchemaData(formData: StyleFields) {
  return {
    item_code: formData.itemCode,
    name: formData.name,
    composition: formData.composition,
    category: formData.category,
    construction: formData.construction,
    finish: formData.finish,
    width_cm: formData.widthCm,
    width_in: formData.widthIn,
    weight_gsm: formData.weightGsm,
    weight_ozsy: formData.weightOzsy,
    pattern: formData.pattern,
    season: formData.season,
    currency: formData.currency,
    price: formData.price,
    price_unit: formData.priceUnit,
  }
}

/**
 * Map snake_case schema key back to camelCase form key
 */
const schemaToFormKey: Record<string, string> = {
  item_code: 'itemCode',
  width_cm: 'widthCm',
  width_in: 'widthIn',
  weight_gsm: 'weightGsm',
  weight_ozsy: 'weightOzsy',
  price_unit: 'priceUnit',
}

export interface UseStyleReviewFormReturn {
  formData: StyleFields
  validationErrors: Record<string, string>
  heroImage: CaptureImage | null
  setHeroImage: (image: CaptureImage | null) => void
  handleFieldChange: (field: string, value: string) => void
  handleSave: (onSave: (data: StyleFields, heroImageId?: string) => void | Promise<void>) => void
}

/**
 * Hook managing the style review form state, validation, and hero image.
 */
export function useStyleReviewForm(
  extractionResult: StyleExtractionResult,
  infoImage: CaptureImage | null,
): UseStyleReviewFormReturn {
  const [formData, setFormData] = useState<StyleFields>(extractionResult.fields)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [heroImage, setHeroImage] = useState<CaptureImage | null>(infoImage)

  useEffect(() => {
    setFormData(extractionResult.fields)
  }, [extractionResult.fields])

  useEffect(() => {
    setHeroImage(infoImage)
  }, [infoImage])

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

  const handleSave = (onSave: (data: StyleFields, heroImageId?: string) => void | Promise<void>) => {
    const schemaData = formToSchemaData(formData)
    const result = styleReviewFormSchema.safeParse(schemaData)

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
    onSave(formData, heroImage?.id)
  }

  return {
    formData,
    validationErrors,
    heroImage,
    setHeroImage,
    handleFieldChange,
    handleSave,
  }
}
