import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEvents } from '@/features/events'
import { useEventRole } from '@/features/auth'
import { useVendorsQuery, useVendorQuery } from '@/features/vendors/hooks/useVendorQueries'
import { useArchiveVendor, useReorderVendors } from '@/features/vendors/hooks/useVendorMutations'
import { useRealtimeRefresh } from '@/lib/realtime'
import { VendorCaptureFlow, VendorListScreen, VendorDetailScreen, VendorEditScreen } from '@/features/vendors'
import { VendorLoadingState, LoadingErrorState, NotFoundErrorState } from '@/components/ui'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import type { VendorRecord } from '@/types/vendor'

/**
 * Vendor list route wrapper — uses TanStack Query, no provider needed.
 */
export function VendorListRouteWrapper() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()
  const { data: vendors = [], isLoading: vendorsLoading, error: vendorsError, refetch: refetchVendors } = useVendorsQuery(eventId)
  const { events, loading: eventsLoading } = useEvents()
  const { canEdit } = useEventRole(eventId)
  const reorderMutation = useReorderVendors(eventId)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active')

  // Refresh vendor list when another user makes changes
  useRealtimeRefresh('vendors', [['vendors', eventId]], { column: 'event_id', value: eventId })

  const event = events.find(e => e.id === eventId)
  const eventName = event?.name || ''

  if (vendorsLoading || eventsLoading) {
    return <VendorLoadingState message="Loading vendors..." />
  }

  if (vendorsError) {
    return (
      <LoadingErrorState
        message={vendorsError instanceof Error ? vendorsError.message : 'Failed to load vendors'}
        onRetry={() => window.location.reload()}
      />
    )
  }

  return (
    <VendorListScreen
      vendors={vendors}
      eventName={eventName}
      eventId={eventId}
      onBack={() => navigate('/')}
      onAddVendor={canEdit ? () => navigate(`/events/${eventId}/vendors/new/capture`) : undefined}
      onVendorClick={(vendor) => navigate(`/events/${eventId}/vendors/${vendor.id}/styles`)}
      onEditVendor={canEdit ? (vendor) => navigate(`/events/${eventId}/vendors/${vendor.id}/edit`) : undefined}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      onReorder={canEdit ? (orderedIds) => reorderMutation.mutate({ orderedIds }) : undefined}
      isReordering={reorderMutation.isPending}
      onRefresh={async () => { await refetchVendors() }}
    />
  )
}

/**
 * Vendor capture flow route wrapper — no provider needed.
 */
export function VendorCaptureFlowFromRouteWithProvider() {
  const { eventId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <VendorCaptureFlow
      eventId={eventId}
      onSuccess={(vendorId) => {
        navigate(`/events/${eventId}/vendors/${vendorId}/styles`)
      }}
      onCancel={() => {
        navigate(`/events/${eventId}/vendors`)
      }}
    />
  )
}

/**
 * Vendor detail route wrapper — uses TanStack Query, no provider needed.
 */
export function VendorDetailFromRouteWithProvider() {
  const { eventId = '', vendorId = '' } = useParams()
  const navigate = useNavigate()
  const { data: vendors = [], isLoading: loading, error } = useVendorsQuery(eventId)
  const { canEdit, canDelete } = useEventRole(eventId)
  const archiveVendorMutation = useArchiveVendor(eventId)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const vendor = vendors.find((v: VendorRecord) => v.id === vendorId)

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await archiveVendorMutation.mutateAsync(vendorId)
      navigate(`/events/${eventId}/vendors`)
    } catch {
      setArchiving(false)
      setShowArchiveConfirm(false)
    }
  }

  if (loading) {
    return <VendorLoadingState message="Loading vendor..." />
  }

  if (error) {
    return (
      <LoadingErrorState
        message={error instanceof Error ? error.message : 'Failed to load vendor'}
        customAction={
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/events/${eventId}/vendors`)}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        }
      />
    )
  }

  if (!vendor) {
    return (
      <NotFoundErrorState
        message="Vendor not found"
        actionText="Back to Vendors"
        onRetry={() => navigate(`/events/${eventId}/vendors`)}
      />
    )
  }

  return (
    <>
      <VendorDetailScreen
        vendor={vendor}
        onBack={() => navigate(`/events/${eventId}/vendors`)}
        onEditVendor={canEdit ? () => navigate(`/events/${eventId}/vendors/${vendorId}/edit`) : undefined}
        onReturnToStyles={() => navigate(`/events/${eventId}/vendors/${vendorId}/styles`)}
        onArchive={canEdit ? () => setShowArchiveConfirm(true) : undefined}
        eventId={eventId}
        canAssign={canDelete}
      />
      <ConfirmationDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        title="Archive Vendor"
        description={`Are you sure you want to archive ${vendor.companyName}? This vendor will be hidden from the list but the data will be preserved.`}
        confirmText={archiving ? 'Archiving...' : 'Archive'}
        onConfirm={handleArchive}
        variant="destructive"
      />
    </>
  )
}

/**
 * Vendor edit route wrapper
 *
 * Uses TanStack Query (useVendorQuery) — no VendorRepositoryProvider needed.
 */
export function VendorEditScreenFromRouteWithProvider() {
  const { eventId = '', vendorId = '' } = useParams()
  const navigate = useNavigate()

  const { data: vendor, isLoading, error } = useVendorQuery(vendorId)
  const { canEdit, isLoading: roleLoading } = useEventRole(eventId)

  // Redirect viewers away
  if (!roleLoading && !canEdit) {
    navigate(`/events/${eventId}/vendors/${vendorId}`, { replace: true })
    return null
  }

  if (isLoading) {
    return <VendorLoadingState message="Loading vendor..." />
  }

  if (error) {
    return (
      <LoadingErrorState
        message={error instanceof Error ? error.message : 'Failed to load vendor'}
        actionText="Back"
        onRetry={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
      />
    )
  }

  if (!vendor) {
    return (
      <NotFoundErrorState
        message="Vendor not found"
        actionText="Back to Vendors"
        onRetry={() => navigate(`/events/${eventId}/vendors`)}
      />
    )
  }

  return (
    <VendorEditScreen
      vendor={vendor}
      eventId={eventId}
      vendorId={vendorId}
      onBack={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
    />
  )
}
