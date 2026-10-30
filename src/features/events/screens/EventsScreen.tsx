import { useState, useMemo, useEffect, useDeferredValue, startTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Edit2, Share2, BarChart3, Trash2, AlertCircle, FileSpreadsheet, FileText } from 'lucide-react'
import { useEventsQuery } from '../hooks/useEventQueries'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEventRepository } from '../api/eventRepository'
import { DeleteEventDialog } from '../components/DeleteEventDialog'
import { ShareDialog } from '@/features/sharing/components/ShareDialog'
import { NotificationBell } from '@/features/notifications'
import { SwipeActions } from '@/components/mobile'
import { PullToRefresh } from '@/components/mobile'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { EntityCard } from '@/components/layout/EntityCard'
import { EmptyState } from '@/components/layout/EmptyState'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { computeEventStatus, getStatusLabel, getStatusBadgeVariant } from '../utils/eventStatus'
import { useEventExport } from '../hooks/useEventExport'
import { useToast } from '@/components/ui/toast'
import type { EventStatus } from '../utils/eventStatus'
import { cn } from '@/lib/utils'

type TabValue = EventStatus

const TABS: { value: TabValue; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'archived', label: 'Archived' },
]

/** Map tab status to the icon used in filtered-tab empty states */
const TAB_EMPTY_ICONS: Record<TabValue, React.ReactNode> = {
  active: <CalendarDays />,
  upcoming: <CalendarDays />,
  archived: <CalendarDays />,
}

const TAB_EMPTY_DESCRIPTIONS: Record<TabValue, string> = {
  active: 'Events that are currently running will appear here.',
  upcoming: 'Events with future start dates will appear here.',
  archived: 'Past events that have ended will appear here.',
}

/**
 * EventsScreen - Displays list of events the user belongs to.
 *
 * Each event links to /events/:eventId/vendors
 */
export function EventsScreen() {
  const { data: events = [], isLoading: loading, error, refetch: refresh } = useEventsQuery()
  const navigate = useNavigate()
  const { deleteEvent } = useEventRepository()
  const { isExportingExcel, isExportingPdf, exportToExcel, exportToPdf, error: exportError, clearError } = useEventExport()
  const { showToast } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [shareTarget, setShareTarget] = useState<{ id: string; name: string } | null>(null)
  const [activeTab, setActiveTab] = useState<TabValue>('active')

  // Show export errors as toast
  useEffect(() => {
    if (exportError) {
      showToast({
        variant: 'error',
        title: 'Export failed',
        description: exportError,
      })
      clearError()
    }
  }, [exportError, showToast, clearError])

  // Compute status for each event and count in a single pass
  // This reduces iterations over the events array
  const { eventsWithStatus, statusCounts } = useMemo(() => {
    const counts: Record<EventStatus, number> = {
      active: 0,
      upcoming: 0,
      archived: 0,
    }

    const withStatus = events.map(event => {
      const status = computeEventStatus(event)
      counts[status]++
      return {
        ...event,
        computedStatus: status
      }
    })

    return { eventsWithStatus: withStatus, statusCounts: counts }
  }, [events])

  // Defer the filtered events so tab changes feel instant
  // The filtering happens but doesn't block interactions
  const deferredActiveTab = useDeferredValue(activeTab)
  const filteredEvents = useMemo(() => {
    return eventsWithStatus.filter(event => event.computedStatus === deferredActiveTab)
  }, [eventsWithStatus, deferredActiveTab])

  // Default to upcoming tab if no active events
  useEffect(() => {
    if (statusCounts.active === 0 && statusCounts.upcoming > 0) {
      setActiveTab('upcoming')
    }
  }, [statusCounts])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteEvent(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    } catch {
      // Error is handled by the dialog staying open
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportExcel = async (eventId: string, eventName: string) => {
    try {
      await exportToExcel(eventId, eventName)
      showToast({
        variant: 'success',
        title: 'Export successful',
        description: `Vendors and styles exported for ${eventName}`,
      })
    } catch {
      // Error is handled by the hook
    }
  }

  const handleExportPdf = async (eventId: string, eventName: string) => {
    try {
      await exportToPdf(eventId)
      showToast({
        variant: 'success',
        title: 'Export successful',
        description: `Catalogue generated for ${eventName}`,
      })
    } catch {
      // Error is handled by the hook
    }
  }

  // ── Loading state ──
  if (loading) {
    return (
      <AppShell>
        <PageHeader
          title="Events"
          subtitle="Trade fairs and exhibitions"
        />
        <main className="flex-1 px-4">
          <EmptyState loading />
        </main>
      </AppShell>
    )
  }

  // ── Error state ──
  if (error) {
    return (
      <AppShell>
        <PageHeader
          title="Events"
          subtitle="Trade fairs and exhibitions"
        />
        <main className="flex-1 px-4">
          <EmptyState
            icon={<AlertCircle />}
            heading="Failed to load events"
            description={error instanceof Error ? error.message : 'Unknown error'}
            action={{ label: 'Retry', onPress: () => refresh(), showPlusPrefix: false }}
            variant="error"
          />
        </main>
      </AppShell>
    )
  }

  // ── No events at all ──
  if (events.length === 0) {
    return (
      <AppShell>
        <PageHeader
          title="Events"
          subtitle="Trade fairs and exhibitions"
          action={<NotificationBell />}
        />
        <main className="flex-1 px-4 pt-4">
          <EmptyState
            icon={<CalendarDays />}
            heading="No events yet"
            description="Create your first trade fair event to get started"
            action={{ label: 'Add Your First Event', onPress: () => navigate('/events/new') }}
          />
        </main>
        <BottomNavigation onAddPress={() => navigate('/events/new')} />
      </AppShell>
    )
  }

  // ── Main content: tabs + filtered event list ──
  return (
    <AppShell>
      <PageHeader
        title="Events"
        subtitle="Trade fairs and exhibitions"
        action={<NotificationBell />}
      />

      {/* ── Status tabs (underline indicator) ── */}
      <div className="border-b border-gray-200 bg-white">
        <Tabs value={activeTab} onValueChange={(v) => startTransition(() => setActiveTab(v as EventStatus))}>
          <TabsList
            className={cn(
              'w-full justify-start bg-transparent',
              'h-auto p-0',
              'px-4 gap-0',
            )}
          >
            {TABS.map(tab => {
              const count = statusCounts[tab.value]
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    // Reset shadcn defaults
                    'relative rounded-none',
                    'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                    // Sizing and spacing
                    'px-3 pb-3 pt-2',
                    'text-sm font-medium',
                    // Colour states
                    'text-gray-400',
                    'data-[state=active]:text-orange-600',
                    // Underline indicator on active
                    'after:absolute after:bottom-0 after:left-3 after:right-3',
                    'after:h-0.5 after:rounded-full',
                    'after:bg-orange-500 after:scale-x-0',
                    'after:transition-transform after:duration-200 after:ease-out',
                    'data-[state=active]:after:scale-x-100',
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'ml-1.5',
                        'inline-flex items-center justify-center',
                        'min-w-[20px] h-5 px-1.5',
                        'rounded-full',
                        'text-[11px] font-semibold leading-none',
                        // Active state: brand-tinted pill
                        'data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700',
                        // Inactive state: neutral pill
                        'data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-500',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Scrollable event list ── */}
      <main className="flex-1 overflow-y-auto px-4 pt-3">
        <PullToRefresh onRefresh={async () => { await refresh() }}>
          {filteredEvents.length === 0 ? (
            <EmptyState
              icon={TAB_EMPTY_ICONS[activeTab]}
              heading={`No ${activeTab} events`}
              description={TAB_EMPTY_DESCRIPTIONS[activeTab]}
              variant="search"
            />
          ) : (
            <div className="grid gap-3">
              {filteredEvents.map((event) => (
                <SwipeActions
                  key={event.id}
                  onEdit={() => navigate(`/events/${event.id}/edit`)}
                  onDelete={() => setDeleteTarget({ id: event.id, name: event.name })}
                >
                  <EntityCard
                    title={event.name}
                    subtitle={getEventSubtitle(event)}
                    badge={{
                      label: getStatusLabel(event.computedStatus),
                      variant: getStatusBadgeVariant(event.computedStatus)
                    }}
                    leadingIcon={<CalendarDays className="w-5 h-5" />}
                    onPress={() => navigate(`/events/${event.id}/vendors`)}
                    actions={[
                      {
                        label: 'Edit',
                        icon: <Edit2 className="w-[18px] h-[18px]" />,
                        onPress: () => navigate(`/events/${event.id}/edit`),
                      },
                      {
                        label: 'Share',
                        icon: <Share2 className="w-[18px] h-[18px]" />,
                        onPress: () => setShareTarget({ id: event.id, name: event.name }),
                      },
                      {
                        label: 'Analytics',
                        icon: <BarChart3 className="w-[18px] h-[18px]" />,
                        onPress: () => navigate(`/events/${event.id}/analytics`),
                      },
                      {
                        label: 'Export Excel/CSV',
                        icon: <FileSpreadsheet className="w-[18px] h-[18px]" />,
                        onPress: () => handleExportExcel(event.id, event.name),
                        disabled: isExportingExcel,
                      },
                      {
                        label: 'Export Catalogue (PDF)',
                        icon: <FileText className="w-[18px] h-[18px]" />,
                        onPress: () => handleExportPdf(event.id, event.name),
                        disabled: isExportingPdf,
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 className="w-[18px] h-[18px]" />,
                        onPress: () => setDeleteTarget({ id: event.id, name: event.name }),
                        destructive: true,
                      },
                    ]}
                    testId={`event-card-${event.id}`}
                  />
                </SwipeActions>
              ))}
            </div>
          )}
        </PullToRefresh>
      </main>

      {/* ── Delete confirmation dialog ── */}
      {deleteTarget && (
        <DeleteEventDialog
          isOpen={true}
          eventId={deleteTarget.id}
          eventName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
        />
      )}

      {/* ── Share dialog ── */}
      {shareTarget && (
        <ShareDialog
          eventId={shareTarget.id}
          eventName={shareTarget.name}
          defaultOpen
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Bottom navigation - uses global overlay provider */}
      <BottomNavigation onAddPress={() => navigate('/events/new')} />
    </AppShell>
  )
}

/**
 * Get event subtitle for display
 */
function getEventSubtitle(event: {
  city?: string | null
  country?: string | null
  starts_on?: string | null
  venue?: string | null
}): string {
  if (event.city && event.country) {
    return `${event.city}, ${event.country}`
  }
  if (event.starts_on) {
    return formatDate(event.starts_on)
  }
  if (event.venue) {
    return event.venue
  }
  return ''
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
