/**
 * Event List Screen
 *
 * Admin screen for managing events.
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Package, MoreVertical, Edit } from 'lucide-react'
import { AdminPageHeader } from '../components/AdminLayout'
import { Button } from '@/components/ui/button'
import {
  getEvents,
  getEventStats,
  updateEventStatus,
  getStatusBadgeColor,
} from '../api/eventManagement'
import { formatDate } from '@/lib/utils/format'
import { createLogger } from '@/lib/logger'

const log = createLogger('EventListScreen')

export function EventListScreen() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => getEvents(true),
  })

  const { data: stats } = useQuery({
    queryKey: ['admin-event-stats'],
    queryFn: getEventStats,
  })

  const handleStatusChange = async (eventId: string, newStatus: 'active' | 'upcoming' | 'archived') => {
    try {
      await updateEventStatus(eventId, newStatus)
      refetch()
    } catch (error) {
      log.error('Failed to update event status', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  const filteredEvents = events?.filter((event) => {
    if (selectedStatus === 'all') return true
    return event.status === selectedStatus
  })

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Events"
        subtitle="Manage trade fair events"
      />

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Total Events</p>
            <p className="text-2xl font-semibold mt-2">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold mt-2 text-green-600">{stats.active}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
            <p className="text-2xl font-semibold mt-2 text-blue-600">{stats.upcoming}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-medium text-muted-foreground">Archived</p>
            <p className="text-2xl font-semibold mt-2 text-gray-600">{stats.archived}</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedStatus === 'all'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedStatus('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedStatus === 'active'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setSelectedStatus('upcoming')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedStatus === 'upcoming'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setSelectedStatus('archived')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            selectedStatus === 'archived'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Archived
        </button>
      </div>

      {/* Events table */}
      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading events...</div>
        ) : !filteredEvents || filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No events found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Event</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Dates</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Vendors</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Styles</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Members</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border last:border-0 hover:bg-accent/50">
                    <td className="p-4">
                      <div>
                        <Link
                          to={`/events/${event.id}/vendors`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {event.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          {event.city && (
                            <>
                              <MapPin className="h-3 w-3" />
                              {event.city}
                              {event.country && `, ${event.country}`}
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(event.status)}`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {event.starts_on ? (
                        <div>
                          <div>{formatDate(event.starts_on)}</div>
                          {event.ends_on && event.ends_on !== event.starts_on && (
                            <div className="text-xs">to {formatDate(event.ends_on)}</div>
                          )}
                        </div>
                      ) : (
                        'Not set'
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        {event.vendor_count ?? 0}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {event.style_count ?? 0}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {event.member_count ?? 0}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/events/${event.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <StatusDropdown
                          onStatusChange={(status) => handleStatusChange(event.id, status)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Status Dropdown Component
 */
interface StatusDropdownProps {
  onStatusChange: (status: 'active' | 'upcoming' | 'archived') => void
}

function StatusDropdown({ onStatusChange }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-md border border-border bg-card shadow-lg">
            <div className="p-1">
              <button
                onClick={() => {
                  onStatusChange('active')
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                Set Active
              </button>
              <button
                onClick={() => {
                  onStatusChange('upcoming')
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                Set Upcoming
              </button>
              <button
                onClick={() => {
                  onStatusChange('archived')
                  setIsOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              >
                Archive
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
