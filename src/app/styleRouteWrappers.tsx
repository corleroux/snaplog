import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useEventRole } from '@/features/auth'
import { useStylesQuery, useDeleteStyle, useToggleShortlist } from '@/features/styles/hooks'
import { useCatalogueItemsQuery } from '@/features/catalogue/hooks/useCatalogueItemsQuery'
import { useVendorsQuery } from '@/features/vendors/hooks/useVendorQueries'
import { useRealtimeRefresh } from '@/lib/realtime'
import { StyleCaptureFlow, StyleListScreen, StyleDetailScreen, StyleEditScreen, VariantEditScreen, type StyleFilters } from '@/features/styles'
import { useStyleDetail } from '@/features/styles'
import { useCatalogueItemDetail } from '@/features/catalogue/hooks/useCatalogueItemDetail'
import { ItemDetailScreen } from '@/features/catalogue/screens/ItemDetailScreen'
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
  // Catalogue items (garments, video items) share the list; an items
  // failure degrades to fabric-only inside the hook, never blocks.
  const { data: catalogueItems = [], refetch: refetchCatalogueItems } = useCatalogueItemsQuery(vendorId)
  useRealtimeRefresh('catalogue_items', [['catalogue-items', vendorId]], { column: 'vendor_id', value: vendorId })

  const vendor = vendors.find((v: VendorRecord) => v.id === vendorId)
  const vendorName = vendor?.companyName || ''

  const catalogueRecords = useMemo(
    () => catalogueItems.map((item) => item.record),
    [catalogueItems],
  )
  const needsReviewIds = useMemo(
    () => new Set(catalogueItems.filter((item) => item.needsReview).map((item) => item.record.id)),
    [catalogueItems],
  )

  const sortedStyles = [...styles, ...catalogueRecords].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const filterOptions = useMemo(() => ({
    categories: [...new Set(sortedStyles.map((s: any) => s.category).filter(Boolean))] as string[],
    seasons: [...new Set(sortedStyles.map((s: any) => s.season).filter(Boolean))] as string[],
    statuses: [...new Set(sortedStyles.map((s: any) => s.status).filter(Boolean))] as string[],
  }), [sortedStyles])

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
      // Picker hub first (schema-driven entry; fabric hands back to legacy).
      onAddStyle={canEdit ? () => navigate(`/events/${eventId}/vendors/${vendorId}/items/new/capture`) : undefined}
      // FAB keeps the fast legacy fabric path (FR-SCH-05b).
      onFabPress={canEdit ? () => navigate(`/events/${eventId}/vendors/${vendorId}/styles/new/capture`) : undefined}
      // Catalogue rows (ci- prefix) open the item detail page; fabric rows
      // open the style detail page. Catalogue rows have no detail write
      // paths, so their clicks are read-only navigation.
      onStyleClick={(style) => {
        if (style.id.startsWith('ci-')) {
          navigate(`/events/${eventId}/vendors/${vendorId}/items/${style.id.slice(3)}`)
          return
        }
        navigate(`/events/${eventId}/vendors/${vendorId}/styles/${style.id}`)
      }}
      onVendorInfo={() => navigate(`/events/${eventId}/vendors/${vendorId}`)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      filters={filters}
      onFiltersChange={setFilters}
      filterOptions={filterOptions}
      onToggleShortlist={(styleId, value) => {
        if (styleId.startsWith('ci-')) {return}
        toggleShortlist.mutate({ styleId, value })
      }}
      needsReviewIds={needsReviewIds}
      onRefresh={async () => { await refetchStyles(); await refetchCatalogueItems() }}
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
      if (!styleId) {return}
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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Catalogue item detail route wrapper (FR-CAT-01) — read-only + archive.
 * The route carries the raw UUID; the `ci-` list prefix is stripped by the
 * list click handler before navigating here.
 */
export function ItemDetailFromRouteWithProvider() {
  const { eventId = '', vendorId = '', itemId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { canEdit } = useEventRole(eventId)
  const stylesPath = `/events/${eventId}/vendors/${vendorId}/styles`

  const validId = UUID_RE.test(itemId)
  const { data, isLoading, error, refetch } = useCatalogueItemDetail(
    vendorId,
    validId ? itemId : '',
  )

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const handleArchive = async () => {
    setArchiving(true)
    try {
      const { error: archiveError } = await supabase
        .from('catalogue_items')
        .update({ status: 'archived' })
        .eq('id', itemId)
        .eq('vendor_id', vendorId)
      if (archiveError) {throw archiveError}
      queryClient.invalidateQueries({ queryKey: ['catalogue-items', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['catalogue-item-detail', vendorId, itemId] })
      navigate(stylesPath)
    } catch {
      setArchiving(false)
      setShowArchiveConfirm(false)
    }
  }

  return (
    <>
      <ItemDetailScreen
        data={data ?? undefined}
        loading={isLoading}
        error={!validId ? 'Invalid item id' : (error instanceof Error ? error.message : null)}
        onRefresh={() => { void refetch() }}
        onBack={() => navigate(stylesPath)}
        onArchive={canEdit ? () => setShowArchiveConfirm(true) : undefined}
      />
      <ConfirmationDialog
        isOpen={showArchiveConfirm}
        onClose={() => setShowArchiveConfirm(false)}
        title="Archive Item"
        description="Are you sure you want to archive this item? It will be hidden from the catalogue but the data will be preserved."
        confirmText={archiving ? 'Archiving...' : 'Archive'}
        onConfirm={() => { void handleArchive() }}
        variant="destructive"
      />
    </>
  )
}
