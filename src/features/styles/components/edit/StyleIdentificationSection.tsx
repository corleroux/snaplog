/**
 * Style Identification Section
 *
 * Item code and name fields for the style edit form.
 */

import { Palette } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { type StyleEditFormValues } from '@/lib/validation/forms/styleEdit.schema'
import { FormField } from './FormField'

export interface StyleIdentificationSectionProps {
  register: UseFormRegister<StyleEditFormValues>
  errors: FieldErrors<StyleEditFormValues>
}

export function StyleIdentificationSection({
  register,
  errors,
}: StyleIdentificationSectionProps) {
  const inputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <SectionContainer
      title="Identification"
      description="Item code and name"
      icon={<Palette className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <FormField
          label="Item Code"
          required
          error={errors.item_code?.message}
        >
          <input
            id="item_code"
            placeholder="TF-001"
            {...register('item_code')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Style Name"
          error={errors.name?.message}
        >
          <input
            id="name"
            placeholder="Cotton Poplin - Plain Weave"
            {...register('name')}
            className={inputClassName}
          />
        </FormField>
      </div>
    </SectionContainer>
  )
}
