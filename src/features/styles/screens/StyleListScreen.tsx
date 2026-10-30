/**
 * Style List Screen Component
 *
 * Lists all styles for a vendor with Add Style CTA.
 *
 * DESIGN ALIGNED:
 * - AppShell + PageHeader layout pattern
 * - Premium image-first cards
 * - Grid layout for visual browsing
 * - Hero visual treatment for styles
 * - Intentional empty state
 * - Mobile-first touch-friendly sizing
 *
 * This is the hero list of the app - Styles should feel
 * visually richer and more immersive than Vendors.
 */

import { type ReactNode, useState, useMemo, useEffect } from 'react'
import { Package, Building2, Search, Loader2, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'
import { StyleCard } from '../components/StyleCard'
import { SwipeActions, PullToRefresh } from '@/components/mobile'
import { BatchExportModal, useBatchExportModal } from '@/features/sharing/components/BatchExportModal'
import { AppShell, PageHeader, BottomNavigation, EmptyState } from '@/components/layout'
import { NotificationBell } from '@/features/notifications'
import type { StyleRecord } from '@/types/style'
import type { FilterConfig } from '@/features/filters/types'

export interface StyleFilters {
  category?: string
  season?: string
  status?: string
}

export interface StyleFilterOptions {
  categories: string[]
  seasons: string[]
  statuses: string[]
}

export interface StyleListScreenProps {
  /** All styles to display */
  styles: StyleRecord[]
  /** Vendor name for header context */
  vendorName?: string
  /** Event ID for navigation */
  eventId?: string
  /** Callback for back navigation */
  onBack?: () => void
  /** Callback when Add Style is clicked */
  onAddStyle?: () => void
  /** Callback when a style is clicked */
  onStyleClick?: (style: StyleRecord) => void
  /** Callback when vendor info icon is clicked */
  onVendorInfo?: () => void
  /** Optional search query */
  searchQuery?: string
  /** Callback when search query changes */
  onSearchChange?: (query: string) => void
  /** Active filters */
  filters?: StyleFilters
  /** Callback when filters change */
  onFiltersChange?: (filters: StyleFilters) => void
  /** Available filter options derived from data */
  filterOptions?: StyleFilterOptions
  /** Optional header content */
  headerContent?: ReactNode
  /** Optional empty state content */
  emptyStateContent?: ReactNode
  /** Whether there is a next page to load */
  hasNextPage?: boolean
  /** Whether the next page is currently loading */
  isFetchingNextPage?: boolean
  /** Callback to load the next page */
  onLoadMore?: () => void
  /** Callback to toggle shortlist */
  onToggleShortlist?: (styleId: string, value: boolean) => void
  /** Pull-to-refresh callback */
  onRefresh?: () => Promise<void>
  /** Additional className */
  className?: string
}

/**
 * Style list screen component
 *
 * Shows:
 * - Page header with title and Add CTA
 * - Premium style cards in grid layout
 * - Empty state when no styles
 * - Image-first, immersive design
 *
 * This is the hero visual entity of the app.
 */
export function StyleListScreen({
  styles,
  vendorName,
  eventId: _eventId,
  onBack,
  onAddStyle,
  onStyleClick,
  onVendorInfo,
  searchQuery = '',
  onSearchChange,
  filters = {},
  onFiltersChange,
  headerContent,
  emptyStateContent,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onToggleShortlist,
  onRefresh,
  className,
}: StyleListScreenProps) {
  const [activeFilterConfig, setActiveFilterConfig] = useState<FilterConfig>({})

  // Export modal state
  const exportModal = useBatchExportModal()

  // Check if any filter is active
  const hasActiveFilters = !!(filters.category || filters.season || filters.status)

  // Sync URL/search param filters to local state on mount
  // Guard against identity loops: setState only when the serialized config
  // actually differs, so inline-fresh prop objects cannot cause an infinite
  // render cycle.
  useEffect(() => {
    const initialConfig: FilterConfig = {}
    if (filters.category) {
      initialConfig.category = [filters.category]
    }
    if (filters.season) {
      initialConfig.season = [filters.season]
    }
    if (filters.status) {
      initialConfig.status = [filters.status]
    }
    if (searchQuery) {
      initialConfig.searchTerm = searchQuery
    }
    setActiveFilterConfig((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(initialConfig)) {
        return prev
      }
      return initialConfig
    })
  }, [filters.category, filters.season, filters.status, searchQuery])

  // Sync local filter state back to URL/search params
  useEffect(() => {
    // Convert filter config back to filters and searchQuery
    const newFilters: StyleFilters = {}
    const newSearchQuery: string = activeFilterConfig.searchTerm ?? ''
    
    if (activeFilterConfig.category) {
      newFilters.category = activeFilterConfig.category[0] ?? undefined
    }
    if (activeFilterConfig.season) {
      newFilters.season = activeFilterConfig.season[0] ?? undefined
    }
    if (activeFilterConfig.status) {
      newFilters.status = activeFilterConfig.status[0] ?? undefined
    }
    
    // Update filters if changed
    if (
      newFilters.category !== filters.category ||
      newFilters.season !== filters.season ||
      newFilters.status !== filters.status
    ) {
      onFiltersChange?.(newFilters)
    }
    // Update search query if changed
    if (newSearchQuery !== searchQuery) {
      onSearchChange?.(newSearchQuery)
    }
  }, [activeFilterConfig, filters, searchQuery, onFiltersChange, onSearchChange])

  // Filter styles by search query AND filter chips
  const filteredStyles = useMemo(() => {
    return styles.filter((style) => {
      const matchesSearch = !searchQuery.trim() ||
        style.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        style.styleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        style.composition.toLowerCase().includes(searchQuery.toLowerCase()) ||
        style.supplierRef.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = !filters.category || style.category === filters.category
      const matchesSeason = !filters.season || style.season === filters.season
      const matchesStatus = !filters.status || style.status === filters.status

      return matchesSearch && matchesCategory && matchesSeason && matchesStatus
    })
  }, [styles, searchQuery, filters])

  const isEmpty = styles.length === 0
  const isFilteredEmpty = !isEmpty && filteredStyles.length === 0

  // Build PageHeader action slot: Notification bell
  // The Add button is now handled by the FAB in BottomNavigation
  const headerAction = <NotificationBell />

  return (
    <AppShell>
      {/* Header */}
       {headerContent || (
         <PageHeader
            title="Styles"
            subtitle={vendorName || 'Fabric styles catalogue'}
           onBack={onBack}
           action={headerAction}
         />
       )}

       {/* HIDDEN: Saved Filters — restore by replacing `false` with `!isEmpty` */}


       {/* Secondary toolbar: Vendor info + Export actions */}
       {(!isEmpty || headerContent) && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          {onVendorInfo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onVendorInfo}
              type="button"
              className="text-muted-foreground hover:text-orange-500 -ml-2"
            >
              <Building2 className="h-4 w-4 mr-1.5" />
              Vendor info
            </Button>
          )}
          {!isEmpty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportModal.open(filteredStyles, 'styles')}
              className="text-muted-foreground hover:text-foreground ml-auto -mr-2"
              disabled={filteredStyles.length === 0}
              type="button"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Export
            </Button>
          )}
        </div>
      )}

      {/* Main scrollable content */}
      <main className={cn('flex-1 overflow-y-auto px-4 pt-3', className)}>
        <PullToRefresh onRefresh={async () => { await onRefresh?.() }}>
        {/* Empty state */}
        {isEmpty && !emptyStateContent && (
          <EmptyState
            icon={<Package />}
            heading="No styles yet"
            description="Capture fabric styles from this vendor to build your catalogue"
            action={onAddStyle ? { label: 'Add Your First Style', onPress: onAddStyle } : undefined}
          />
        )}

        {/* Custom empty state */}
        {isEmpty && emptyStateContent}

        {/* No results from search */}
        {isFilteredEmpty && (
          <EmptyState
            icon={<Search />}
            heading="No styles found"
            description="Try adjusting your search or filters"
            variant="search"
          />
        )}

        {/* Style grid - premium cards with vertical rhythm */}
        {!isEmpty && !isFilteredEmpty && (
          <div className="grid gap-5">
            {filteredStyles.map((style) => (
              <SwipeActions key={style.id}>
                <StyleCard
                  style={style}
                  onClick={onStyleClick}
                  onToggleShortlist={onToggleShortlist}
                />
              </SwipeActions>
            ))}
          </div>
        )}

        {/* Style count */}
        {!isEmpty && !isFilteredEmpty && (
          <div className="text-center text-sm text-muted-foreground py-4">
            {filteredStyles.length} style{filteredStyles.length !== 1 ? 's' : ''}
            {(searchQuery || hasActiveFilters) && ` (filtered from ${styles.length} total)`}
          </div>
        )}

        {/* Load More button */}
        {hasNextPage && !searchQuery && (
          <div className="flex justify-center pb-4">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
              type="button"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Load More'
              )}
            </Button>
          </div>
        )}
        </PullToRefresh>
      </main>

      {/* Bottom navigation */}
      <BottomNavigation onAddPress={onAddStyle} />

      {/* Export Modal */}
      <BatchExportModal
        isOpen={exportModal.isOpen}
        onClose={exportModal.close}
        items={exportModal.items}
        itemType={exportModal.itemType}
      />
    </AppShell>
  )
}
