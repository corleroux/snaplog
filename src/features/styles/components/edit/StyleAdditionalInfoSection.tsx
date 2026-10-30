/**
 * Style Additional Information Section
 *
 * Season, supplier reference, and metadata fields
 * for the style edit form.
 */

import { SectionContainer } from '@/components/ui/section-container'
import { type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { type StyleEditFormValues } from '@/lib/validation/forms/styleEdit.schema'
import { FormField } from './FormField'

export interface StyleAdditionalInfoSectionProps {
  register: UseFormRegister<StyleEditFormValues>
  errors: FieldErrors<StyleEditFormValues>
}

export function StyleAdditionalInfoSection({
  register,
  errors,
}: StyleAdditionalInfoSectionProps) {
  const inputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <SectionContainer
      title="Additional Information"
      description="Season and custom metadata"
    >
      <div className="space-y-4">
        <FormField
          label="Season"
          error={errors.season?.message}
        >
          <input
            id="season"
            placeholder="Spring/Summer 2024"
            {...register('season')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Metadata (JSON)"
          error={errors.metadata?.message}
          hint="Optional JSON metadata for custom fields"
        >
          <textarea
            id="metadata"
            placeholder='{"key": "value"}'
            rows={4}
            {...register('metadata')}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </FormField>
      </div>
    </SectionContainer>
  )
}
