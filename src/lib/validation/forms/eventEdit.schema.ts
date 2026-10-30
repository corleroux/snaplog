/**
 * Zod schemas for event edit validation.
 *
 * These schemas validate:
 * - Create form submissions for new events
 * - Edit form submissions for existing events
 */

import { z } from 'zod'

/**
 * URL validation regex.
 */
const urlRegex = /^https?:\/\/.+/i

/**
 * Event edit form values schema.
 *
 * Used for validation in the create/edit screen form.
 * All fields are strings for form input handling.
 */
export const eventEditFormSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  slug: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  venue: z.string().optional(),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
  coverImageUrl: z.string().optional().refine(
    (val) => !val || val === '' || urlRegex.test(val),
    { message: 'Cover image must be a valid URL starting with http:// or https://' }
  ),
  status: z.enum(['active', 'upcoming', 'archived']).default('active'),
}).refine(
  (data) => {
    if (data.startsOn && data.endsOn) {
      return new Date(data.endsOn) >= new Date(data.startsOn)
    }
    return true
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['endsOn'],
  }
)

// Base inferred type has optional status (due to .default())
type BaseEventEditFormValues = z.infer<typeof eventEditFormSchema>

// Override to make status required for form compatibility
// The form always provides status via defaultValues, so this is safe
export type EventEditFormValues = Omit<BaseEventEditFormValues, 'status'> & {
  status: 'active' | 'upcoming' | 'archived'
}
