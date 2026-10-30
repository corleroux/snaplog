/**
 * Zod schemas for vendor edit validation.
 *
 * These schemas validate:
 * - Edit form submissions for committed vendor records
 *
 * This is separate from extraction validation because edits
 * apply to committed business records, not scan sessions.
 */

import { z } from 'zod'

/**
 * Email validation regex.
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Phone number validation.
 */
const phoneRegex = /^\+?[\d\s\-\(\)]+$/

/**
 * Website URL validation.
 */
const urlRegex = /^https?:\/\/.+/i

/**
 * Vendor edit form values schema.
 *
 * Used for validation in the edit screen form.
 * All fields are strings for form input handling.
 */
export const vendorEditFormSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  booth_number: z.string().optional(),
  contact_person: z.string().optional(),
  email: z.string().optional().refine(
    (val) => !val || emailRegex.test(val),
    'Invalid email format'
  ),
  phone: z.string().optional().refine(
    (val) => !val || phoneRegex.test(val),
    'Invalid phone format'
  ),
  website_url: z.string().optional().refine(
    (val) => !val || urlRegex.test(val),
    'Website must start with http:// or https://'
  ),
  address: z.string().optional(),
  country_of_origin: z.string().optional(),
  brand_names: z.string().optional(),
  notes: z.string().optional(),
})

export type VendorEditFormValues = z.infer<typeof vendorEditFormSchema>
