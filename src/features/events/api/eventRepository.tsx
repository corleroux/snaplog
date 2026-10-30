/**
 * Event Repository - Persistence Seam
 *
 * This repository provides the app-facing Event domain contract
 * while mapping to the existing events persistence structure.
 *
 * APP-FACING DOMAIN → PERSISTENCE MAPPING:
 * - EventRecord → events table
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Event } from '@/lib/supabase/types'

const logger = createLogger('EventRepo')

/**
 * App-facing Event domain types for repository operations
 */

/**
 * App-facing event record (camelCase for frontend)
 */
export interface EventRecord {
  id: string
  name: string
  slug: string | null
  city: string | null
  country: string | null
  venue: string | null
  startsOn: string | null
  endsOn: string | null
  coverImageUrl: string | null
  status: 'active' | 'upcoming' | 'archived'
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new event
 */
export interface EventCreateInput {
  name: string
  slug?: string
  city?: string
  country?: string
  venue?: string
  startsOn?: string
  endsOn?: string
  coverImageUrl?: string
  status?: 'active' | 'upcoming' | 'archived'
}

/**
 * Input for updating an existing event
 */
export interface EventUpdateInput {
  name?: string
  slug?: string
  city?: string
  country?: string
  venue?: string
  startsOn?: string
  endsOn?: string
  coverImageUrl?: string
  status?: 'active' | 'upcoming' | 'archived'
}

/**
 * Mapper functions: App-facing ↔ Persistence-facing
 */

/**
 * Generate a URL-friendly slug from an event name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Convert persistence-facing events row to app-facing EventRecord
 */
export function eventRowToEventRecord(row: Event): EventRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    country: row.country,
    venue: row.venue,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    coverImageUrl: row.cover_image_url,
    status: row.status as EventRecord['status'],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Convert app-facing EventCreateInput to persistence-facing events insert
 */
export function eventCreateInputToEventRow(
  input: EventCreateInput,
  userId: string
): Omit<Event, 'id' | 'created_at' | 'updated_at'> {
  return {
    name: input.name,
    slug: input.slug || generateSlug(input.name),
    city: input.city || null,
    country: input.country || null,
    venue: input.venue || null,
    starts_on: input.startsOn || null,
    ends_on: input.endsOn || null,
    cover_image_url: input.coverImageUrl || null,
    status: input.status || 'active',
    created_by: userId,
  }
}

/**
 * Convert app-facing EventUpdateInput to persistence-facing events update
 */
export function eventUpdateInputToEventRow(
  input: EventUpdateInput
): Partial<Omit<Event, 'id' | 'created_at' | 'updated_at' | 'created_by'>> {
  const updateData: any = {}

  if (input.name !== undefined) updateData.name = input.name
  if (input.slug !== undefined) updateData.slug = input.slug || null
  if (input.city !== undefined) updateData.city = input.city || null
  if (input.country !== undefined) updateData.country = input.country || null
  if (input.venue !== undefined) updateData.venue = input.venue || null
  if (input.startsOn !== undefined) updateData.starts_on = input.startsOn || null
  if (input.endsOn !== undefined) updateData.ends_on = input.endsOn || null
  if (input.coverImageUrl !== undefined) updateData.cover_image_url = input.coverImageUrl || null
  if (input.status !== undefined) updateData.status = input.status

  return updateData
}

/**
 * Repository contract interface
 */
export interface EventRepository {
  // Read operations
  getById(id: string): Promise<EventRecord | null>

  // Write operations
  create(input: EventCreateInput): Promise<EventRecord>
  update(id: string, input: EventUpdateInput): Promise<EventRecord>
  delete(id: string): Promise<void>
}

/**
 * Supabase-backed repository implementation
 */
export class SupabaseEventRepository implements EventRepository {
  /**
   * Ensure a slug is unique by checking against existing events.
   * Appends a timestamp suffix if the slug already exists.
   */
  private async ensureUniqueSlug(slug: string): Promise<string> {
    if (!slug) return slug

    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return `${slug}-${Date.now()}`
    }

    return slug
  }

  async getById(id: string): Promise<EventRecord | null> {
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw error
    }

    return eventRowToEventRecord(event)
  }

  async create(input: EventCreateInput): Promise<EventRecord> {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Generate slug and ensure uniqueness
    const eventRow = eventCreateInputToEventRow(input, user.id)
    eventRow.slug = await this.ensureUniqueSlug(eventRow.slug || '')

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(eventRow)
      .select()
      .single()

    if (eventError) {
      throw eventError
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('event_members')
      .insert({
        event_id: event.id,
        user_id: user.id,
        role: 'owner',
      })

    if (memberError) {
      throw memberError
    }

    // Return the created event
    const createdEvent = await this.getById(event.id)
    if (!createdEvent) {
      throw new Error('Failed to retrieve created event')
    }
    return createdEvent
  }

  async update(id: string, input: EventUpdateInput): Promise<EventRecord> {
    const updateData = eventUpdateInputToEventRow(input)

    const { error } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id)

    if (error) {
      throw error
    }

    const updatedEvent = await this.getById(id)
    if (!updatedEvent) {
      throw new Error('Failed to retrieve updated event')
    }
    return updatedEvent
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
  }
}

/**
 * Factory function to create a repository instance
 */
export function createEventRepository(): EventRepository {
  return new SupabaseEventRepository()
}

/**
 * Singleton instance for use in the app
 */
export const eventRepository = createEventRepository()

/**
 * ============================================
 * REPOSITORY PROVIDER AND HOOKS
 * ============================================
 *
 * This section provides React Context-based access to the repository,
 * replacing the mock store pattern with real Supabase persistence.
 */

/**
 * Repository context value
 */
interface EventRepositoryContextValue {
  /** Get an event by ID */
  getEvent: (id: string) => Promise<EventRecord | null>
  /** Create a new event */
  createEvent: (input: EventCreateInput) => Promise<EventRecord>
  /** Update an existing event */
  updateEvent: (id: string, input: EventUpdateInput) => Promise<EventRecord>
  /** Delete an event */
  deleteEvent: (id: string) => Promise<void>
}

const EventRepositoryContext = createContext<EventRepositoryContextValue | null>(null)

/**
 * Event Repository Provider props
 */
export interface EventRepositoryProviderProps {
  children: ReactNode
}

/**
 * Event Repository Provider component
 *
 * Wraps the app to provide event state management backed by the repository.
 *
 * @example
 * ```tsx
 * <EventRepositoryProvider>
 *   <App />
 * </EventRepositoryProvider>
 * ```
 */
export function EventRepositoryProvider({
  children,
}: EventRepositoryProviderProps) {
  // Get event by ID
  const getEvent = useCallback(
    async (id: string) => {
      return await eventRepository.getById(id)
    },
    []
  )

  // Create event
  const createEvent = useCallback(async (input: EventCreateInput) => {
    return await eventRepository.create(input)
  }, [])

  // Update event
  const updateEvent = useCallback(async (id: string, input: EventUpdateInput) => {
    return await eventRepository.update(id, input)
  }, [])

  // Delete event
  const deleteEvent = useCallback(async (id: string) => {
    await eventRepository.delete(id)
  }, [])

  const value: EventRepositoryContextValue = {
    getEvent,
    createEvent,
    updateEvent,
    deleteEvent,
  }

  return (
    <EventRepositoryContext.Provider value={value}>
      {children}
    </EventRepositoryContext.Provider>
  )
}

/**
 * Hook to access the event repository
 *
 * @throws Error if used outside of EventRepositoryProvider
 *
 * @example
 * ```tsx
 * const { getEvent, createEvent, updateEvent, deleteEvent } = useEventRepository()
 * ```
 */
export function useEventRepository(): EventRepositoryContextValue {
  const context = useContext(EventRepositoryContext)
  if (!context) {
    throw new Error('useEventRepository must be used within EventRepositoryProvider')
  }
  return context
}

/**
 * Hook to get a single event by ID
 *
 * @example
 * ```tsx
 * const { event, loading, error } = useEvent('event-123')
 * ```
 */
export function useEvent(eventId: string): {
  event: EventRecord | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
} {
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getEvent } = useEventRepository()

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const loaded = await getEvent(eventId)
      setEvent(loaded)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load event'
      setError(message)
      logger.error('Error loading event', { error: String(err) })
    } finally {
      setLoading(false)
    }
  }, [eventId, getEvent])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  return {
    event,
    loading,
    error,
    refresh: loadEvent,
  }
}
