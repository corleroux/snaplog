/**
 * Event Validation Schema Tests
 *
 * Tests the Zod schemas for:
 * - eventEditFormSchema (create/edit form validation)
 * - addMemberSchema (member email validation)
 */

import { describe, it, expect } from 'vitest'

describe('eventEditFormSchema', () => {
  it('should accept valid event form data', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Texworld Paris',
      city: 'Paris',
      country: 'France',
      startsOn: '2025-01-01',
      endsOn: '2025-01-03',
    })

    expect(result.success).toBe(true)
  })

  it('should reject empty name', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: '',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Event name is required')
    }
  })

  it('should reject missing name', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('should accept minimal valid data (name only)', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Simple Event',
    })

    expect(result.success).toBe(true)
  })

  it('should reject end date before start date', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Test Event',
      startsOn: '2025-06-10',
      endsOn: '2025-06-05',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'endsOn'
      )
      expect(issue?.message).toBe('End date must be after or equal to start date')
    }
  })

  it('should accept equal start and end dates', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'One Day Event',
      startsOn: '2025-06-05',
      endsOn: '2025-06-05',
    })

    expect(result.success).toBe(true)
  })

  it('should accept valid dates when only one is provided', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Open-ended Event',
      startsOn: '2025-06-01',
    })

    expect(result.success).toBe(true)
  })

  it('should accept valid cover image URL', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Event',
      coverImageUrl: 'https://example.com/cover.jpg',
    })

    expect(result.success).toBe(true)
  })

  it('should reject invalid cover image URL', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Event',
      coverImageUrl: 'not-a-url',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path.includes('coverImageUrl')
      )
      expect(issue).toBeDefined()
    }
  })

  it('should accept empty string cover image URL', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Event',
      coverImageUrl: '',
    })

    expect(result.success).toBe(true)
  })

  it('should default status to active when not provided', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Event',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('active')
    }
  })

  it('should accept valid status values', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    for (const status of ['active', 'upcoming', 'archived'] as const) {
      const result = eventEditFormSchema.safeParse({
        name: 'Event',
        status,
      })
      expect(result.success).toBe(true)
    }
  })

  it('should reject invalid status value', async () => {
    const { eventEditFormSchema } = await import('@/lib/validation/forms/eventEdit.schema')

    const result = eventEditFormSchema.safeParse({
      name: 'Event',
      status: 'invalid',
    })

    expect(result.success).toBe(false)
  })
})

describe('addMemberSchema', () => {
  it('should accept valid email', async () => {
    const { addMemberSchema } = await import('@/lib/validation/forms/eventMembers.schema')

    const result = addMemberSchema.safeParse({
      email: 'user@example.com',
    })

    expect(result.success).toBe(true)
  })

  it('should reject invalid email', async () => {
    const { addMemberSchema } = await import('@/lib/validation/forms/eventMembers.schema')

    const result = addMemberSchema.safeParse({
      email: 'not-an-email',
    })

    expect(result.success).toBe(false)
  })

  it('should reject empty email', async () => {
    const { addMemberSchema } = await import('@/lib/validation/forms/eventMembers.schema')

    const result = addMemberSchema.safeParse({
      email: '',
    })

    expect(result.success).toBe(false)
  })

  it('should reject missing email', async () => {
    const { addMemberSchema } = await import('@/lib/validation/forms/eventMembers.schema')

    const result = addMemberSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})
