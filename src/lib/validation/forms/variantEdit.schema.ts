/**
 * Zod schemas for variant edit validation.
 *
 * These schemas validate:
 * - Edit form submissions for committed variant records
 *
 * This is separate from extraction validation because edits
 * apply to committed business records, not scan sessions.
 */

import { z } from 'zod'

/**
 * Non-negative number validation for form inputs.
 * Accepts string that can be parsed to a non-negative number.
 */
const nonNegativeStringNumber = z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number').optional()

/**
 * Stock status options.
 */
const stockStatusEnum = z.enum(['in_stock', 'low_stock', 'reserved', 'sample_only', 'out_of_stock'])

/**
 * Variant edit form values schema.
 *
 * Used for validation in the edit screen form.
 * All fields are strings for form input handling.
 */
export const variantEditFormSchema = z.object({
  color_code: z.string().optional(),
  color_name: z.string().optional(),
  variant_name: z.string().optional(),
  wash_code: z.string().optional(),
  finish_override: z.string().optional(),
  quantity: nonNegativeStringNumber,
  unit: z.string().optional(),
  batch_no: z.string().optional(),
  stock_status: stockStatusEnum,
  metadata: z.string().optional(),
})

export type VariantEditFormValues = z.infer<typeof variantEditFormSchema>
