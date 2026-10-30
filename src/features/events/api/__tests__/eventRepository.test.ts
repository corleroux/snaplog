/**
 * Event Repository Tests
 *
 * Tests the event repository for:
 * - generateSlug (pure function)
 * - eventRowToEventRecord (mapper)
 * - eventCreateInputToEventRow (mapper)
 * - eventUpdateInputToEventRow (mapper)
 * - CRUD operations via SupabaseEventRepository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockSupabaseChain } from '@/test/supabaseMocks'
import {
  generateSlug,
  eventRowToEventRecord,
  eventCreateInputToEventRow,
  eventUpdateInputToEventRow,
  SupabaseEventRepository,
} from '../eventRepository'

// --- generateSlug ---

describe('generateSlug', () => {
  it('should convert a simple name to a slug', () => {
    expect(generateSlug('Texworld Paris')).toBe('texworld-paris')
  })

  it('should lowercase the name', () => {
    expect(generateSlug('MUNICH FABRIC')).toBe('munich-fabric')
  })

  it('should replace special characters with hyphens', () => {
    expect(generateSlug('Première Vision')).toBe('premi-re-vision')
  })

  it('should collapse multiple non-alphanumeric into single hyphen', () => {
    expect(generateSlug('Foo   Bar!!!Baz')).toBe('foo-bar-baz')
  })

  it('should strip leading and trailing hyphens', () => {
    expect(generateSlug('-- Hello World --')).toBe('hello-world')
  })

  it('should handle names with numbers', () => {
    expect(generateSlug('Texworld 2025')).toBe('texworld-2025')
  })

  it('should handle an empty string', () => {
    expect(generateSlug('')).toBe('')
  })

  it('should handle a name with only special characters', () => {
    expect(generateSlug('!!!@@@')).toBe('')
  })
})

// --- eventRowToEventRecord ---

describe('eventRowToEventRecord', () => {
  it('should map persistence row to app-facing EventRecord', () => {
    const row = {
      id: 'evt-1',
      name: 'Texworld',
      slug: 'texworld',
      city: 'Paris',
      country: 'France',
      venue: 'Parc des Expositions',
      starts_on: '2025-01-01',
      ends_on: '2025-01-03',
      cover_image_url: 'https://example.com/img.jpg',
      status: 'active' as const,
      created_by: 'user-1',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    const record = eventRowToEventRecord(row as any)

    expect(record).toEqual({
      id: 'evt-1',
      name: 'Texworld',
      slug: 'texworld',
      city: 'Paris',
      country: 'France',
      venue: 'Parc des Expositions',
      startsOn: '2025-01-01',
      endsOn: '2025-01-03',
      coverImageUrl: 'https://example.com/img.jpg',
      status: 'active',
      createdBy: 'user-1',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    })
  })

  it('should handle null optional fields', () => {
    const row = {
      id: 'evt-2',
      name: 'Test Event',
      slug: null,
      city: null,
      country: null,
      venue: null,
      starts_on: null,
      ends_on: null,
      cover_image_url: null,
      status: 'upcoming' as const,
      created_by: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    const record = eventRowToEventRecord(row as any)

    expect(record.slug).toBeNull()
    expect(record.city).toBeNull()
    expect(record.coverImageUrl).toBeNull()
  })
})

// --- eventCreateInputToEventRow ---

describe('eventCreateInputToEventRow', () => {
  it('should map create input to persistence row with generated slug', () => {
    const input = {
      name: 'Texworld Paris',
      city: 'Paris',
      country: 'France',
    }

    const row = eventCreateInputToEventRow(input, 'user-1')

    expect(row).toEqual({
      name: 'Texworld Paris',
      slug: 'texworld-paris',
      city: 'Paris',
      country: 'France',
      venue: null,
      starts_on: null,
      ends_on: null,
      cover_image_url: null,
      status: 'active',
      created_by: 'user-1',
    })
  })

  it('should use explicit slug when provided', () => {
    const input = {
      name: 'Texworld Paris',
      slug: 'custom-slug',
    }

    const row = eventCreateInputToEventRow(input, 'user-1')
    expect(row.slug).toBe('custom-slug')
  })

  it('should default status to active', () => {
    const input = { name: 'Test' }
    const row = eventCreateInputToEventRow(input, 'user-1')
    expect(row.status).toBe('active')
  })

  it('should respect provided status', () => {
    const input = { name: 'Test', status: 'upcoming' as const }
    const row = eventCreateInputToEventRow(input, 'user-1')
    expect(row.status).toBe('upcoming')
  })

  it('should convert empty strings to null', () => {
    const input = { name: 'Test', city: '', country: '' }
    const row = eventCreateInputToEventRow(input, 'user-1')
    expect(row.city).toBeNull()
    expect(row.country).toBeNull()
  })
})

// --- eventUpdateInputToEventRow ---

describe('eventUpdateInputToEventRow', () => {
  it('should map only provided fields', () => {
    const input = { name: 'Updated Name' }
    const row = eventUpdateInputToEventRow(input)

    expect(row).toEqual({ name: 'Updated Name' })
  })

  it('should map all fields when provided', () => {
    const input = {
      name: 'New Name',
      slug: 'new-slug',
      city: 'Berlin',
      country: 'Germany',
      venue: 'Messe',
      startsOn: '2025-06-01',
      endsOn: '2025-06-03',
      coverImageUrl: 'https://example.com/new.jpg',
      status: 'archived' as const,
    }

    const row = eventUpdateInputToEventRow(input)

    expect(row).toEqual({
      name: 'New Name',
      slug: 'new-slug',
      city: 'Berlin',
      country: 'Germany',
      venue: 'Messe',
      starts_on: '2025-06-01',
      ends_on: '2025-06-03',
      cover_image_url: 'https://example.com/new.jpg',
      status: 'archived',
    })
  })

  it('should convert empty slug to null', () => {
    const input = { slug: '' }
    const row = eventUpdateInputToEventRow(input)
    expect(row.slug).toBeNull()
  })

  it('should convert empty city to null', () => {
    const input = { city: '' }
    const row = eventUpdateInputToEventRow(input)
    expect(row.city).toBeNull()
  })

  it('should return empty object when no fields provided', () => {
    const input = {}
    const row = eventUpdateInputToEventRow(input)
    expect(Object.keys(row)).toHaveLength(0)
  })
})

// --- SupabaseEventRepository CRUD ---

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(() => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(() => ({ data: { session: null }, error: null })),
    },
  },
}))

import { supabase } from '@/lib/supabase/client'
const mockFrom = vi.mocked(supabase.from)
const mockGetUser = vi.mocked(supabase.auth.getUser)



describe('SupabaseEventRepository', () => {
  let repository: SupabaseEventRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new SupabaseEventRepository()
  })

  describe('getById', () => {
    it('should return EventRecord when event exists', async () => {
      const mockEvent = {
        id: 'evt-1',
        name: 'Texworld',
        slug: 'texworld',
        city: 'Paris',
        country: 'France',
        venue: null,
        starts_on: null,
        ends_on: null,
        cover_image_url: null,
        status: 'active',
        created_by: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      const chain = createMockSupabaseChain({ data: mockEvent, error: null })
      mockFrom.mockReturnValue(chain as any)

      const result = await repository.getById('evt-1')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('evt-1')
      expect(result!.name).toBe('Texworld')
      expect(mockFrom).toHaveBeenCalledWith('events')
    })

    it('should return null when event not found (PGRST116)', async () => {
      const chain = createMockSupabaseChain({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      })
      mockFrom.mockReturnValue(chain as any)

      const result = await repository.getById('nonexistent')
      expect(result).toBeNull()
    })

    it('should throw on database error', async () => {
      const chain = createMockSupabaseChain({
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      })
      mockFrom.mockReturnValue(chain as any)

      await expect(repository.getById('evt-1')).rejects.toEqual(
        expect.objectContaining({ code: '42P01' })
      )
    })
  })

  describe('create', () => {
    it('should create event and add creator as owner', async () => {
      const userId = 'user-1'
      const insertedEvent = {
        id: 'evt-new',
        name: 'New Event',
        slug: 'new-event',
        city: null,
        country: null,
        venue: null,
        starts_on: null,
        ends_on: null,
        cover_image_url: null,
        status: 'active',
        created_by: userId,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      mockGetUser.mockResolvedValue({ data: { user: { id: userId } } } as any)

      // First call: ensureUniqueSlug (uses .select().eq().maybeSingle())
      const slugCheckChain = createMockSupabaseChain({ data: null, error: null })
      // Second call: insert event (uses .insert().select().single())
      const insertChain = createMockSupabaseChain({ data: insertedEvent, error: null })
      // Third call: insert member (uses .insert() awaited directly)
      const memberChain = createMockSupabaseChain({ error: null })
      // Fourth call: getById (uses .select().eq().single())
      const getChain = createMockSupabaseChain({ data: insertedEvent, error: null })

      mockFrom
        .mockReturnValueOnce(slugCheckChain as any)
        .mockReturnValueOnce(insertChain as any)
        .mockReturnValueOnce(memberChain as any)
        .mockReturnValueOnce(getChain as any)

      const result = await repository.create({ name: 'New Event' })

      expect(result.name).toBe('New Event')
      expect(mockFrom).toHaveBeenCalledWith('events')
      expect(mockFrom).toHaveBeenCalledWith('event_members')
    })

    it('should throw if user not authenticated', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } } as any)

      await expect(repository.create({ name: 'Test' })).rejects.toThrow(
        'User not authenticated'
      )
    })

    it('should throw on event insert error', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } } as any)

      const chain = createMockSupabaseChain({
        data: null,
        error: { message: 'Insert failed' },
      })
      mockFrom.mockReturnValue(chain as any)

      await expect(repository.create({ name: 'Test' })).rejects.toEqual(
        expect.objectContaining({ message: 'Insert failed' })
      )
    })
  })

  describe('update', () => {
    it('should update event and return updated record', async () => {
      const updatedEvent = {
        id: 'evt-1',
        name: 'Updated Event',
        slug: 'updated-event',
        city: 'Berlin',
        country: null,
        venue: null,
        starts_on: null,
        ends_on: null,
        cover_image_url: null,
        status: 'active',
        created_by: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      }

      // First call: update (uses .update().eq() — thenable)
      const updateChain = createMockSupabaseChain({ error: null })
      // Second call: getById (uses .select().eq().single())
      const getChain = createMockSupabaseChain({ data: updatedEvent, error: null })

      mockFrom
        .mockReturnValueOnce(updateChain as any)
        .mockReturnValueOnce(getChain as any)

      const result = await repository.update('evt-1', { name: 'Updated Event' })

      expect(result.name).toBe('Updated Event')
    })

    it('should throw on update error', async () => {
      const chain = createMockSupabaseChain({
        error: { message: 'Update failed' },
      })
      mockFrom.mockReturnValue(chain as any)

      await expect(
        repository.update('evt-1', { name: 'X' })
      ).rejects.toEqual(expect.objectContaining({ message: 'Update failed' }))
    })
  })

  describe('delete', () => {
    it('should delete event without error', async () => {
      const chain = createMockSupabaseChain({ error: null })
      mockFrom.mockReturnValue(chain as any)

      await expect(repository.delete('evt-1')).resolves.toBeUndefined()
      expect(mockFrom).toHaveBeenCalledWith('events')
    })

    it('should throw on delete error', async () => {
      const chain = createMockSupabaseChain({
        error: { message: 'Delete failed' },
      })
      mockFrom.mockReturnValue(chain as any)

      await expect(repository.delete('evt-1')).rejects.toEqual(
        expect.objectContaining({ message: 'Delete failed' })
      )
    })
  })
})
