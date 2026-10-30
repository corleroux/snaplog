/**
 * Style Categorization Section
 *
 * Composition, category, construction, finish, and pattern fields
 * for the style edit form.
 */

import { Palette } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { type StyleEditFormValues } from '@/lib/validation/forms/styleEdit.schema'
import { FormField } from './FormField'

export interface StyleCategorizationSectionProps {
  register: UseFormRegister<StyleEditFormValues>
  errors: FieldErrors<StyleEditFormValues>
}

export function StyleCategorizationSection({
  register,
  errors,
}: StyleCategorizationSectionProps) {
  const inputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <SectionContainer
      title="Categorization"
      description="Material classification"
      icon={<Palette className="h-5 w-5" />}
    >
      <div className="space-y-4">
        <FormField
          label="Composition"
          error={errors.composition?.message}
        >
          <input
            id="composition"
            placeholder="100% Cotton"
            {...register('composition')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Category"
          error={errors.category?.message}
        >
          <input
            id="category"
            placeholder="Woven Fabric"
            {...register('category')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Construction"
          error={errors.construction?.message}
        >
          <input
            id="construction"
            placeholder="Plain Weave, 40x40"
            {...register('construction')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Finish"
          error={errors.finish?.message}
        >
          <input
            id="finish"
            placeholder="Mercerized, Calendered"
            {...register('finish')}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Pattern"
          error={errors.pattern?.message}
        >
          <input
            id="pattern"
            placeholder="Solid, Stripe, Check"
            {...register('pattern')}
            className={inputClassName}
          />
        </FormField>
      </div>
    </SectionContainer>
  )
}
