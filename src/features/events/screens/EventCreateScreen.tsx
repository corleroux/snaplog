/**
 * Event Create/Edit Screen Component
 *
 * Allows creating new events or editing existing events.
 *
 * DESIGN ALIGNED:
 * - Premium surfaces with warm orange accent
 * - Clear visual hierarchy and flow progress
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with VendorEditScreen design system
 */

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Building2, AlertTriangle, Loader2, Image as ImageIcon, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button, AppFrame, BottomActionBar, Input, Label } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import { useToast } from '@/components/ui/toast'
import { useDirtyFormGuardRHF } from '@/hooks'
import { useEventRepository, type EventUpdateInput } from '../api/eventRepository'
import type { EventRecord } from '../api/eventRepository'
import { eventEditFormSchema, type EventEditFormValues } from '@/lib/validation/forms/eventEdit.schema'
import { useEvent } from '../api/eventRepository'
import { EventMembersSection, canEditEventMembers } from '../components/EventMembersSection'
import { supabase } from '@/lib/supabase/client'
import { PageHeader } from '@/components/layout/PageHeader'

type ScreenState = 'loading' | 'loaded' | 'saving' | 'error'

export interface EventCreateScreenProps {
  /** The event ID to edit (for edit mode) */
  eventId?: string
  /** Callback for successful create */
  onSuccess?: (eventId: string) => void
  /** Callback for cancel */
  onCancel?: () => void
  /** Mode - 'create' or 'edit' */
  mode?: 'create' | 'edit'
  /** Additional className */
  className?: string
}

/**
 * Event create/edit screen component
 *
 * Shows:
 * - Header with back button
 * - Editable form sections for all event fields
 * - Sticky bottom action bar with Save/Cancel buttons
 */
export function EventCreateScreen({
  eventId,
  onSuccess,
  onCancel,
  mode = 'create',
  className,
}: EventCreateScreenProps) {
  const navigate = useNavigate()
  const { createEvent, updateEvent } = useEventRepository()
  const { showToast } = useToast()
  const isEditMode = mode === 'edit'

  const [screenState, setScreenState] = useState<ScreenState>(isEditMode ? 'loading' : 'loaded')
  const [errorMessage, setError] = useState<string | null>(null)
  const [event, setEvent] = useState<EventRecord | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id)
      }
    })
  }, [])

  // Load user role for edit mode
  useEffect(() => {
    if (isEditMode && eventId && currentUserId) {
      supabase
        .from('event_members')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', currentUserId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setUserRole(data.role)
          }
        })
    }
  }, [isEditMode, eventId, currentUserId])

  // Load event data for edit mode
  const { event: loadedEvent, loading: eventLoading, error: eventError } = useEvent(eventId || '')

  useEffect(() => {
    if (isEditMode) {
      if (eventLoading) {
        setScreenState('loading')
      } else if (eventError) {
        setScreenState('error')
        setError(eventError)
      } else if (loadedEvent) {
        setEvent(loadedEvent)
        setScreenState('loaded')
      }
    }
  }, [isEditMode, eventLoading, eventError, loadedEvent])

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EventEditFormValues>({
    resolver: zodResolver(eventEditFormSchema) as any, // Type cast needed due to .default() making status optional in schema
    defaultValues: {
      name: '',
      slug: '',
      city: '',
      country: '',
      venue: '',
      startsOn: '',
      endsOn: '',
      coverImageUrl: '',
      status: 'upcoming',
    },
  })

  // Auto-generate slug from name
  const nameValue = watch('name')
  useEffect(() => {
    if (mode === 'create' && nameValue && !watch('slug')) {
      const slug = nameValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      setValue('slug', slug)
    }
  }, [nameValue, mode, setValue, watch])

  // Populate form with event data for edit mode
  useEffect(() => {
    if (isEditMode && event) {
      const formValues: EventEditFormValues = {
        name: event.name || '',
        slug: event.slug || '',
        city: event.city || '',
        country: event.country || '',
        venue: event.venue || '',
        startsOn: event.startsOn ? new Date(event.startsOn).toISOString().split('T')[0] : '',
        endsOn: event.endsOn ? new Date(event.endsOn).toISOString().split('T')[0] : '',
        coverImageUrl: event.coverImageUrl || '',
        status: event.status,
      }
      reset(formValues)
    }
  }, [isEditMode, event, reset])

  // Use shared dirty form guard for unsaved changes protection
  const dirtyGuard = useDirtyFormGuardRHF({
    isDirty,
    onConfirm: () => {
      if (onCancel) {
        onCancel()
      } else {
        navigate('/')
      }
    },
    title: 'Discard changes?',
    message: 'You have unsaved changes to this event. If you leave, your changes will be lost.',
  })

  /**
   * Save event data.
   *
   * Creates or updates the event record in the repository (Supabase-backed).
   */
  const handleSave = useCallback(async (values: EventEditFormValues) => {
    setScreenState('saving')
    setError(null)

    try {
      if (isEditMode && eventId) {
        // Update existing event
        const updates: EventUpdateInput = {
          name: values.name,
          slug: values.slug || undefined,
          city: values.city || undefined,
          country: values.country || undefined,
          venue: values.venue || undefined,
          startsOn: values.startsOn || undefined,
          endsOn: values.endsOn || undefined,
          coverImageUrl: values.coverImageUrl || undefined,
          status: values.status,
        }

        await updateEvent(eventId, updates)

        // Show success toast
        showToast({
          title: 'Event saved',
          description: 'Your changes have been saved successfully',
          variant: 'success',
          duration: 3000,
        })

        // Navigate back after brief delay
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(eventId)
          } else {
            navigate('/')
          }
        }, 500)
      } else {
        // Create new event
        const created = await createEvent({
          name: values.name,
          slug: values.slug,
          city: values.city || undefined,
          country: values.country || undefined,
          venue: values.venue || undefined,
          startsOn: values.startsOn || undefined,
          endsOn: values.endsOn || undefined,
          coverImageUrl: values.coverImageUrl || undefined,
          status: values.status,
        })

        // Show success toast
        showToast({
          title: 'Event created',
          description: 'Your new event has been created successfully',
          variant: 'success',
          duration: 3000,
        })

        // Navigate to event dashboard after brief delay
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(created.id)
          } else {
            navigate('/')
          }
        }, 500)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${isEditMode ? 'update' : 'create'} event`
      setError(errorMessage)
      setScreenState('loaded')

      // Show error toast
      showToast({
        title: 'Save failed',
        description: errorMessage,
        variant: 'error',
        duration: 5000,
      })
    }
  }, [isEditMode, eventId, updateEvent, createEvent, showToast, navigate, onSuccess, onCancel])

  // Loading state
  if (screenState === 'loading') {
    return (
      <AppFrame className={cn('flex items-center justify-center', className)}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-muted-foreground">Loading event data...</p>
        </div>
      </AppFrame>
    )
  }

  // Error state
  if (screenState === 'error') {
    return (
      <AppFrame className={cn('flex items-center justify-center px-4', className)}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-semibold">Failed to load event</h2>
          <p className="text-muted-foreground">{errorMessage || 'Please try again.'}</p>
          <Link to="/">
            <Button variant="outline" radius="pill">
              Back to Events
            </Button>
          </Link>
        </div>
      </AppFrame>
    )
  }

  const title = isEditMode ? 'Edit Event' : 'Create Event'
  const description = isEditMode ? 'Update event information' : 'Add a new trade fair event'

  return (
    <AppFrame className={className}>
      {/* Header */}
      <PageHeader
        title={title}
        subtitle={description}
        onClose={() => {
          if (dirtyGuard.isDirty) {
            dirtyGuard.handleNavigateAway()
          } else {
            onCancel ? onCancel() : navigate('/')
          }
        }}
      />

      {/* Main content */}
      <main className="px-4 py-6 pb-safe-offset space-y-6">
        {/* Error display */}
        {errorMessage && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(handleSave)} className="space-y-8">
          {/* Basic Info Section */}
          <SectionContainer
            title="Basic Info"
            description="Event identity and current status"
            icon={<Building2 className="h-5 w-5 text-orange-500" />}
          >
            <div className="space-y-5">
              <Input
                label="Event Name"
                placeholder="Techtextil 2024"
                {...register('name')}
                errorText={errors.name?.message}
                required
              />

              <Input
                label="Slug"
                placeholder="techtextil-2024"
                {...register('slug')}
                errorText={errors.slug?.message}
                helperText="URL-friendly identifier (auto-generated from name)"
              />

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  {...register('status')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-orange-500/50"
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
                {errors.status?.message && (
                  <p className="text-sm text-destructive">{errors.status.message}</p>
                )}
              </div>
            </div>
          </SectionContainer>

          {/* Location Section */}
          <SectionContainer
            title="Location"
            description="Where the event is held"
            icon={<MapPin className="h-5 w-5 text-orange-500" />}
          >
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  placeholder="Frankfurt"
                  {...register('city')}
                  errorText={errors.city?.message}
                />

                <Input
                  label="Country"
                  placeholder="Germany"
                  {...register('country')}
                  errorText={errors.country?.message}
                />
              </div>

              <Input
                label="Venue"
                placeholder="Messe Frankfurt"
                {...register('venue')}
                errorText={errors.venue?.message}
              />
            </div>
          </SectionContainer>

          {/* Dates Section */}
          <SectionContainer
            title="Dates"
            description="When the event takes place"
            icon={<Calendar className="h-5 w-5 text-orange-500" />}
          >
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Start Date"
                type="date"
                {...register('startsOn')}
                errorText={errors.startsOn?.message}
              />

              <Input
                label="End Date"
                type="date"
                {...register('endsOn')}
                errorText={errors.endsOn?.message}
              />
            </div>
          </SectionContainer>

          {/* Cover Image Section */}
          <SectionContainer
            title="Cover Image"
            description="Optional visual represention"
            icon={<ImageIcon className="h-5 w-5 text-orange-500" />}
          >
            <div className="space-y-4">
              <Input
                label="Cover Image URL"
                type="url"
                placeholder="https://example.com/event-cover.jpg"
                {...register('coverImageUrl')}
                errorText={errors.coverImageUrl?.message}
                helperText="Full URL to the cover image"
              />

              {/* Cover image preview */}
              {watch('coverImageUrl') && (
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-muted shadow-inner">
                  <img
                    src={watch('coverImageUrl')}
                    alt="Cover preview"
                    className="h-full w-full object-cover transition-opacity duration-300"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%23f1f5f9" width="400" height="200"/%3E%3Ctext fill="%2364748b" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EInvalid Image URL%3C/text%3E%3C/svg%3E'
                    }}
                  />
                </div>
              )}
            </div>
          </SectionContainer>

          {/* Event Members Section - Edit mode only */}
          {isEditMode && eventId && currentUserId && (
            <SectionContainer
              title="Event Members"
              description="Manage team access"
              icon={<Users className="h-5 w-5 text-orange-500" />}
            >
              <EventMembersSection
                eventId={eventId}
                currentUserId={currentUserId}
                canEdit={canEditEventMembers(userRole || undefined)}
              />
            </SectionContainer>
          )}
        </form>
      </main>

      {/* Sticky bottom action bar */}
      <BottomActionBar>
        <Button
          type="button"
          variant="outline"
          onClick={dirtyGuard.handleNavigateAway}
          disabled={screenState === 'saving'}
          className="flex-1"
          radius="pill"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="accent"
          onClick={handleSubmit(handleSave)}
          disabled={screenState === 'saving' || !isDirty}
          className="flex-1"
          radius="pill"
        >
          {screenState === 'saving' ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            isEditMode ? 'Save Changes' : 'Create Event'
          )}
        </Button>
      </BottomActionBar>

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dirtyGuard.isShowingConfirmation}
        onClose={dirtyGuard.cancelNavigation}
        onConfirm={dirtyGuard.confirmNavigation}
        title={dirtyGuard.dialogTitle}
        description={dirtyGuard.dialogMessage}
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="destructive"
        icon={<AlertTriangle className="h-6 w-6 text-amber-500" />}
      />
    </AppFrame>
  )
}

/**
 * Event Edit Screen - reuses EventCreateScreen with edit mode
 */
export interface EventEditScreenProps {
  /** The event ID to edit */
  eventId: string
  /** Callback for back navigation */
  onBack?: () => void
  /** Additional className */
  className?: string
}

export function EventEditScreen({ eventId, onBack, className }: EventEditScreenProps) {
  return (
    <EventCreateScreen
      eventId={eventId}
      mode="edit"
      onCancel={onBack}
      className={className}
    />
  )
}
