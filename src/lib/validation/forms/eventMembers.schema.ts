/**
 * Zod schemas for event members management.
 *
 * These schemas validate:
 * - Adding members to events via email search
 */

import { z } from 'zod'

/**
 * Add member form values schema.
 *
 * Used for validation when adding a user to an event via email.
 */
export const addMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export type AddMemberFormValues = z.infer<typeof addMemberSchema>
