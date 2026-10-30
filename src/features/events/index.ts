/**
 * Events Feature Module
 *
 * Events are metadata-only (name, dates, venue) with no image capture or AI
 * extraction pipeline. Unlike Vendors and Styles, which flow through
 * draftStore → offlineCaptureService → syncEngine → commit for offline
 * resilience, Events use direct Supabase CRUD via the repository pattern.
 *
 * This asymmetry is intentional — the offline pipeline exists for capture
 * flows that involve camera images and multi-step review. Events are simple
 * metadata forms created with connectivity, so no offline infrastructure is
 * needed. See the knowledge graph audit (Task #86) for the full rationale.
 */

export { EventsScreen } from './screens/EventsScreen'
export { EventCreateScreen, EventEditScreen } from './screens/EventCreateScreen'
export { useEvents } from './hooks/useEvents'
export { getEvents } from './api/getEvents'
export { useEventExport } from './hooks/useEventExport'

// TanStack Query hooks - additive cache layer
export {
  useEventsQuery,
  useEventQuery,
  useInvalidateEvents,
  useInvalidateEvent,
  eventKeys,
} from './hooks/useEventQueries'
export {
  EventRepositoryProvider,
  useEventRepository,
  useEvent,
  createEventRepository,
  eventRepository,
  type EventRecord,
  type EventCreateInput,
  type EventUpdateInput,
} from './api/eventRepository'
export { generateSlug, eventRowToEventRecord } from './api/eventRepository'
export { EventMembersSection, canEditEventMembers } from './components/EventMembersSection'
export { AddMemberModal } from './components/AddMemberModal'
export {
  getEventMembers,
  searchUsersByEmail,
  addMemberToEvent,
  removeMemberFromEvent,
  type EventMemberRecord,
  type AddMemberInput,
} from './api/eventMembersRepository'
export { addMemberSchema, type AddMemberFormValues } from '@/lib/validation/forms/eventMembers.schema'
export { EventSettingsScreen } from './screens/EventSettingsScreen'
