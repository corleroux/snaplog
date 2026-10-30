import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEventRole } from '@/features/auth'
import { useStylesQuery, useDeleteStyle, useToggleShortlist } from '@/features/styles/hooks'
import { useVendorsQuery } from '@/features/vendors/hooks/useVendorQueries'
import { useRealtimeRefresh } from '@/lib/realtime'
import { StyleCaptureFlow, StyleListScreen, StyleDetailScreen, StyleEditScreen, VariantEditScreen, type StyleFilters } from '@/features/styles'
import { useStyleDetail } from '@/features/styles'
import { StyleLoadingState, LoadingErrorState } from '@/components/ui'
import { ConfirmationDialog } from '@/components/feedback/ConfirmationDialog'
import type { VendorRecord } from '@/types/vendor'

/**
 * Style list route wrapper — uses TanStack Query, no provider needed.
 */
export function StyleListFromRouteWithProvider() {
  const { eventId = '', vendorId = '' } = useParams()
  const navigate = useNavigate()
  const { data: styles = [], isLoading: stylesLoading, error: stylesError, refetch: refetchStyles } = useStylesQuery(vendorId)
  const { data: vendors = [], isLoading: vendorsLoading, error: vendorsError } = useVendorsQuery(eventId)
  const { canEdit } = useEventRole(eventId)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<StyleFilters>({})

  useRealtimeRefresh('fabric_styles', [['styles', vendorId]], { column: 'vendor_id', value: vendorId })

  const vendor = vendors.find((v: VendorRecord) => v.id === vendorId)
  const vendorName = vendor?.companyName || ''

  const sortedStyles = [...styles].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const filterOptions = useMemo(() => ({
    categories: [...new Set(styles.map((s: any) => s.category).filter(Boolean))] as string[],
    seasons: [...new Set(styles.map((s: any) => s.season).filter(Boolean))] as string[],
    statuses: [...new Set(styles.map((s: any) => s.status).filter(Boolean))] as string[],
  }), [styles])

  const toggleShortlist = useToggleShortlist(vendorId)

  if (stylesLoading || vendorsLoading) {
    return <StyleLoadingState message="Loading styles..." />
  }

  if (stylesError || vendorsError) {
    return (
      <LoadingErrorState
        message={
          (stylesError instanceof Error ? stylesError.message : String(stylesError ?? '')) ||
          (vendorsError instanceof Error ? vendorsError.message : String(vendorsError ?? '')) ||
          'Failed to load catalogue'
        }
        customAction={
          <button
            onClick={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
          >
            Back to Vendor
          </button>
        }
      />
    )
  }

  return (
    <StyleListScreen
      styles={sortedStyles}
      vendorName={vendorName}
      eventId={eventId}
      onBack={() => navigate(`/events/${eventId}/vendors`)}
      onAddStyle={canEdit ? () => navigate(`/events/${eventId}/vendors/${vendorId}/styles/new/capture`) : undefined}
      onStyleClick={(style) => navigate(`/events/${eventId}/vendors/${vendorId}/styles/${style.id}`)}
      onVendorInfo={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      onFiltersChange={setFilters}
      filterOptions={filterOptions}
      onToggleShortlist={(styleId, value) => toggleShortlist.mutate({ styleId, value })}
      onRefresh={async () => { await refetchStyles() }}
    />
  )
}

/**
 * Style capture flow route wrapper — no provider needed.
 */
export function StyleCaptureFlowFromRouteWithProvider() {
  const { eventId = '', vendorId = '' } = useParams()
  const navigate = useNavigate()

  return (
    <StyleCaptureFlow
      eventId={eventId}
      vendorId={vendorId}
      onSuccess={() => navigate(`/events/${eventId}/vendors/${vendorId}/styles`)}
      onCancel={() => navigate(`/events/${eventId}/vendors/${vendorId}/styles`)}
    />
  )
}

/**
 * Style detail route wrapper — uses TanStack Query, no provider needed.
 */
export function StyleDetailFromRouteWithProvider() {
  const { eventId = '', vendorId = '', styleId = '' } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, refresh } = useStyleDetail(styleId)
  const { canEdit, canDelete } = useEventRole(eventId)
  const deleteStyleMutation = useDeleteStyle(vendorId)
  const toggleShortlist = useToggleShortlist(vendorId)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<import('@/features/approvals').ApprovalStatus | null>(null)

  useEffect(() => {
    const fetchApprovalStatus = async () => {
      if (!styleId) return
      try {
        const { getLatestApprovalStatus } = await import('@/features/approvals')
        getLatestApprovalStatus('style', styleId).then(setApprovalStatus).catch(() => {})
      } catch {
        // Silently fail - approvals feature may not be fully configured
      }
    }
    fetchApprovalStatus()
  }, [styleId, data])

  const handleArchive = async () => {
    setArchiving(true)
    try {
      await deleteStyleMutation.mutateAsync(styleId)
      navigate(`/events/${eventId}/vendors/${vendorId}/styles`)
    } catch {
      setArchiving(false)
      setShowArchiveConfirm(false)
    }
  }

  const canRequestApproval = canEdit
  const canRespondToApproval = canDelete

  return (
    <>
      <StyleDetailScreen
        data={data ?? undefined}
        loading={loading}
        error={error}
        onRefresh={refresh}
        onBack={() => navigate(`/events/${eventId}/vendors/${vendorId}/styles`)}
        onEdit={canEdit ? () => navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}/edit`) : undefined}
        onArchive={canEdit ? () => setShowArchiveConfirm(true) : undefined}
        approvalStatus={approvalStatus}
        canRequestApproval={canRequestApproval}
        canRespondToApproval={canRespondToApproval}
        canAssign={canDelete}
        onToggleShortlist={(value) => toggleShortlist.mutate({ styleId, value })}
      />
      <ConfirmationDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        title="Archive Style"
        description="Are you sure you want to archive this style? It will be hidden from the catalogue but the data will be preserved."
        confirmText={archiving ? 'Archiving...' : 'Archive'}
        onConfirm={handleArchive}
        variant="destructive"
      />
    </>
  )
}

/**
 * Style edit route wrapper — no provider needed (StyleEditScreen fetches its own data).
 */
export function StyleEditScreenFromRouteWithProvider() {
  const { eventId = '', vendorId = '', styleId = '' } = useParams()
  const navigate = useNavigate()
  const { canEdit, isLoading: roleLoading } = useEventRole(eventId)

  if (!roleLoading && !canEdit) {
    navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`, { replace: true })
    return null
  }

  return (
    <StyleEditScreen
      eventId={eventId}
      vendorId={vendorId}
      styleId={styleId}
      onBack={() => navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`)}
      onSave={() => navigate(`/events/${eventId}/vendors/${vendorId}/styles`)}
    />
  )
}

/**
 * Variant edit route wrapper — no provider needed.
 */
export function VariantEditScreenFromRouteWithProvider() {
  const { eventId = '', vendorId = '', styleId = '', variantId = '' } = useParams()
  const navigate = useNavigate()
  const { canEdit, isLoading: roleLoading } = useEventRole(eventId)

  if (!roleLoading && !canEdit) {
    navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`, { replace: true })
    return null
  }

  return (
    <VariantEditScreen
      eventId={eventId}
      vendorId={vendorId}
      styleId={styleId}
      variantId={variantId}
      onBack={() => navigate(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`)}
    />
  )
}