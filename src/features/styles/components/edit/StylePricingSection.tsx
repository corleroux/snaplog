/**
 * Style Pricing Section
 *
 * Currency, price, MOQ, lead time, and pricing notes fields
 * for the style edit form.
 */

import { DollarSign } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { type UseFormRegister, type FieldErrors } from 'react-hook-form'
import { type StyleEditFormValues } from '@/lib/validation/forms/styleEdit.schema'
import { FormField } from './FormField'

export interface StylePricingSectionProps {
  register: UseFormRegister<StyleEditFormValues>
  errors: FieldErrors<StyleEditFormValues>
}

export function StylePricingSection({
  register,
  errors,
}: StylePricingSectionProps) {
  const inputClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

  const selectClassName =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

  return (
    <SectionContainer
      title="Pricing"
      description="Commercial terms and pricing"
      icon={<DollarSign className="h-5 w-5" />}
    >
      <div className="space-y-4">
        {/* Price Row - Currency, Price, Unit */}
        <div className="grid grid-cols-3 gap-3">
          <FormField
            label="Currency"
            error={errors.currency?.message}
          >
            <select
              id="currency"
              {...register('currency')}
              className={selectClassName}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="CNY">CNY</option>
            </select>
          </FormField>

          <FormField
            label="Price"
            error={errors.price?.message}
          >
            <input
              id="price"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('price')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Unit"
            error={errors.price_unit?.message}
          >
            <select
              id="price_unit"
              {...register('price_unit')}
              className={selectClassName}
            >
              <option value="yard">Per Yard</option>
              <option value="meter">Per Meter</option>
              <option value="kg">Per Kg</option>
            </select>
          </FormField>
        </div>

        {/* MOQ Row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="MOQ Quantity"
            error={errors.minimum_order_quantity?.message}
          >
            <input
              id="minimum_order_quantity"
              type="number"
              placeholder="100"
              {...register('minimum_order_quantity')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="MOQ Unit"
            error={errors.minimum_order_unit?.message}
          >
            <input
              id="minimum_order_unit"
              placeholder="yards, meters, kg"
              {...register('minimum_order_unit')}
              className={inputClassName}
            />
          </FormField>
        </div>

        {/* Lead Time Row */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Lead Time"
            error={errors.lead_time_value?.message}
          >
            <input
              id="lead_time_value"
              type="number"
              placeholder="14"
              {...register('lead_time_value')}
              className={inputClassName}
            />
          </FormField>

          <FormField
            label="Lead Time Unit"
            error={errors.lead_time_unit?.message}
          >
            <input
              id="lead_time_unit"
              placeholder="days, weeks"
              {...register('lead_time_unit')}
              className={inputClassName}
            />
          </FormField>
        </div>

        {/* Notes */}
        <FormField
          label="Pricing Notes"
          error={errors.price_notes?.message}
        >
          <textarea
            id="price_notes"
            placeholder="FOB, minimum order terms, etc."
            rows={2}
            {...register('price_notes')}
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </FormField>
      </div>
    </SectionContainer>
  )
}
