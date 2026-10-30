/**
 * Zod schemas for style edit validation.
 *
 * These schemas validate:
 * - Edit form submissions for committed fabric style records
 *
 * This is separate from extraction validation because edits
 * apply to committed business records, not scan sessions.
 */

import { z } from 'zod'

/**
 * Stringified number validation for form inputs.
 * Accepts string that can be parsed to a number.
 */
const stringNumber = z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number').optional()

/**
 * Style edit form values schema.
 *
 * Used for validation in the edit screen form.
 * All fields are strings for form input handling.
 */
export const styleEditFormSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  name: z.string().optional(),
  composition: z.string().optional(),
  category: z.string().optional(),
  construction: z.string().optional(),
  finish: z.string().optional(),
  width_cm: stringNumber,
  width_in: stringNumber,
  weight_gsm: stringNumber,
  weight_ozsy: stringNumber,
  pattern: z.string().optional(),
  season: z.string().optional(),
  metadata: z.string().optional(),
  // Pricing fields
  currency: z.enum(['USD', 'EUR', 'CNY']).optional(),
  price: z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number').optional(),
  price_unit: z.enum(['yard', 'meter', 'kg']).optional(),
  minimum_order_quantity: z.string().regex(/^\d*$/, 'Must be a number').optional(),
  minimum_order_unit: z.string().optional(),
  lead_time_value: z.string().regex(/^\d*$/, 'Must be a number').optional(),
  lead_time_unit: z.string().optional(),
  price_notes: z.string().optional(),
})

export type StyleEditFormValues = z.infer<typeof styleEditFormSchema>
