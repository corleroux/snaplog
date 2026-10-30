/**
 * Style Measurements Section
 *
 * Width and weight fields for the style edit form.
 */

import { Ruler } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { type StyleEditFormValues } from '@/lib/validation/forms/styleEdit.schema'
import { FormField } from './FormField'

export interface StyleMeasurementsSectionProps {
  register: UseFormRegister<StyleEditFormValues>
  errors: FieldErrors<StyleEditFormValues>
}

export function StyleMeasurementsSection({
  register,
  errors,
}: StyleMeasurementsSectionProps) {
  const inputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <SectionContainer
      title="Measurements"
      description="Physical dimensions and weight"
      icon={<Ruler className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Width (cm)"
            error={errors.width_cm?.message}
          >
            <input
              id="width_cm"
              type="number"
              step="0.1"
              placeholder="150"
              {...register('width_cm')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Width (in)"
            error={errors.width_in?.message}
          >
            <input
              id="width_in"
              type="number"
              step="0.1"
              placeholder="59"
              {...register('width_in')}
              className={inputClassName}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Weight (gsm)"
            error={errors.weight_gsm?.message}
          >
            <input
              id="weight_gsm"
              type="number"
              step="0.1"
              placeholder="120"
              {...register('weight_gsm')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Weight (oz/yd\u00B2)"
            error={errors.weight_ozsy?.message}
          >
            <input
              id="weight_ozsy"
              type="number"
              step="0.01"
              placeholder="3.5"
              {...register('weight_ozsy')}
              className={inputClassName}
            />
          </FormField>
        </div>
      </div>
    </SectionContainer>
  )
}
