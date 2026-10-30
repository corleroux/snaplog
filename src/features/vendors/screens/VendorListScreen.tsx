/**
 * Vendor List Screen Component
 *
 * Lists all vendors for an event with Add Vendor CTA.
 *
 * DESIGN ALIGNED:
 * - Premium surfaces with warm accent
 * - Clean scannable list
 * - Lightweight vendor cards
 * - Intentional empty state
 * - Mobile-first touch-friendly sizing
 */

import { type ReactNode, useMemo, startTransition, useDeferredValue } from 'react'
import { Building2, Search, Loader2, Pencil, Archive, GripVertical } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SwipeActions } from '@/components/mobile'
import { PullToRefresh } from '@/components/mobile'
import type { VendorRecord } from '@/types/vendor'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { EntityCard } from '@/components/layout/EntityCard'
import { EmptyState } from '@/components/layout/EmptyState'
import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { NotificationBell } from '@/features/notifications'

type TabValue = 'active' | 'archived'

const TABS: { value: TabValue; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
]

/** Map tab status to the icon used in filtered-tab empty states */
const TAB_EMPTY_ICONS: Record<TabValue, React.ReactNode> = {
  active: <Building2 />,
  archived: <Archive />,
}

const TAB_EMPTY_DESCRIPTIONS: Record<TabValue, string> = {
  active: 'Active vendors will appear here.',
  archived: 'Archived vendors will appear here.',
}

export interface VendorListScreenProps {
  /** All vendors to display */
  vendors: VendorRecord[]
  /** Event name for header context */
  eventName?: string
  /** Event ID for navigation */
  eventId?: string
  /** Callback for back navigation */
  onBack?: () => void
  /** Callback when Add Vendor is clicked */
  onAddVendor?: () => void
  /** Callback when a vendor is clicked */
  onVendorClick?: (vendor: VendorRecord) => void
  /** Callback when a vendor edit icon is clicked */
  onEditVendor?: (vendor: VendorRecord) => void
  /** Optional search query */
  searchQuery?: string
  /** Callback when search query changes */
  onSearchChange?: (query: string) => void
  /** Active status filter */
  statusFilter?: TabValue
  /** Callback when status filter changes */
  onStatusFilterChange?: (status: TabValue) => void
  /** Callback for refresh (pull-to-refresh) */
  onRefresh?: () => Promise<void>
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
  /** Callback when vendors are reordered via drag-and-drop */
  onReorder?: (orderedIds: string[]) => void
  /** Whether a reorder operation is in progress */
  isReordering?: boolean
  /** Additional className */
  className?: string
}

/**
 * Vendor list screen component
 *
 * Shows:
 * - Page header with title and Add CTA
 * - Status tabs with count badges (Active/Archived)
 * - Optional search bar
 * - Vendor cards in vertical list
 * - Empty state when no vendors
 * - Matches EventsScreen styling and layout patterns
 */
export function VendorListScreen({
  vendors,
  eventName,
  eventId: _eventId, // Reserved for future use
  onBack,
  onAddVendor,
  onVendorClick,
  onEditVendor,
  searchQuery = '',
  onSearchChange,
  statusFilter = 'active',
  onStatusFilterChange,
  onRefresh,
  headerContent,
  emptyStateContent,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onReorder,
  isReordering: _isReordering,
  className: _className,
}: VendorListScreenProps) {
  const canReorder = !searchQuery.trim() && statusFilter === 'active' && !!onReorder

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = filteredVendors.findIndex(v => v.id === active.id)
    const newIndex = filteredVendors.findIndex(v => v.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(filteredVendors, oldIndex, newIndex)
    onReorder?.(reordered.map(v => v.id))
  }
  // Count vendors per status for display
  const statusCounts = useMemo(() => {
    return {
      active: vendors.filter(v => v.status !== 'archived').length,
      archived: vendors.filter(v => v.status === 'archived').length,
    }
  }, [vendors])

  // Defer the active tab for instant UI response
  const deferredActiveTab = useDeferredValue(statusFilter)

  // Filter vendors by search query AND status
  // Use deferred tab value so filtering doesn't block tab switching
  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch = !searchQuery.trim() ||
        vendor.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.boothNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = vendor.status === deferredActiveTab

      return matchesSearch && matchesStatus
    })
  }, [vendors, searchQuery, deferredActiveTab])

  const isEmpty = vendors.length === 0
  const isFilteredEmpty = !isEmpty && filteredVendors.length === 0

  return (
    <>
      <AppShell>
        {/* Page Header */}
        {headerContent || (
          <PageHeader
            title="Vendors"
            subtitle={eventName || 'Trade fair vendors'}
            onBack={onBack}
            action={<NotificationBell />}
          />
        )}

        {/* ── Status tabs (underline indicator) ── */}
        {!isEmpty && (
          <div className="border-b border-gray-200 bg-white">
            <Tabs value={statusFilter} onValueChange={(v) => startTransition(() => onStatusFilterChange?.(v as TabValue))}>
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
        )}

        {/* ── Scrollable vendor list ── */}
        <main className="flex-1 overflow-y-auto px-4 pt-3">
          <PullToRefresh onRefresh={async () => { await onRefresh?.() }}>
            {/* Optional search bar */}
            {!isEmpty && onSearchChange && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search vendors..."
                  className="bg-muted/50 pl-10 h-11 border-none rounded-xl focus-visible:ring-orange-500/30"
                />
              </div>
            )}

            {/* Empty state - no vendors yet */}
            {isEmpty && !emptyStateContent && (
              <EmptyState
                icon={<Building2 className="w-6 h-6" />}
                heading="No vendors yet"
                description="Start by adding your first vendor. Capture their business card or booth sign to extract their information automatically."
                action={onAddVendor ? { label: 'Add Your First Vendor', onPress: onAddVendor } : undefined}
              />
            )}

            {/* Custom empty state */}
            {isEmpty && emptyStateContent}

            {/* No results from search or filter */}
            {isFilteredEmpty && (
              <EmptyState
                icon={TAB_EMPTY_ICONS[statusFilter]}
                heading={`No ${statusFilter} vendors`}
                description={TAB_EMPTY_DESCRIPTIONS[statusFilter]}
                variant="search"
              />
            )}

            {/* Vendor list */}
            {!isEmpty && !isFilteredEmpty && (
              canReorder ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
                  <SortableContext items={filteredVendors.map(v => v.id)} strategy={verticalListSortingStrategy}>
                    <div className="grid gap-3">
                      {filteredVendors.map((vendor) => (
                        <SortableVendorItem
                          key={vendor.id}
                          vendor={vendor}
                          onEditVendor={onEditVendor}
                          onVendorClick={onVendorClick}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="grid gap-3">
                  {filteredVendors.map((vendor) => (
                    <SwipeActions
                      key={vendor.id}
                      onEdit={onEditVendor ? () => onEditVendor(vendor) : undefined}
                    >
                      <EntityCard
                        title={vendor.companyName}
                        subtitle={getVendorSubtitle(vendor)}
                        badge={vendor.status === 'archived' ? { label: 'Archived', variant: 'archived' } : undefined}
                        countChip={vendor.styleCount !== undefined ? `${vendor.styleCount} ${vendor.styleCount === 1 ? 'style' : 'styles'}` : undefined}
                        leadingIcon={<Building2 className="w-5 h-5" />}
                        onPress={() => onVendorClick?.(vendor)}
                        actions={[
                          ...(onEditVendor ? [{
                            label: 'Edit',
                            icon: <Pencil className="w-[18px] h-[18px]" />,
                            onPress: () => onEditVendor(vendor),
                          }] : []),
                          {
                            label: 'Archive',
                            icon: <Archive className="w-[18px] h-[18px]" />,
                            onPress: () => {
                              // Archive action - to be implemented
                            },
                          },
                        ]}
                        testId={`vendor-card-${vendor.id}`}
                      />
                    </SwipeActions>
                  ))}
                </div>
              )
            )}

            {/* Vendor count */}
            {!isEmpty && !isFilteredEmpty && (
              <>
                <div className="text-center text-sm text-muted-foreground py-2">
                  {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
                  {(searchQuery || statusFilter) && ` (filtered from ${vendors.length} total)`}
                </div>
                <div className="sr-only">
                  {filteredVendors.length} vendor{filteredVendors.length !== 1 ? 's' : ''}
                </div>
              </>
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
        <BottomNavigation onAddPress={onAddVendor} />
      </AppShell>
    </>
  )
}

/**
 * Get vendor subtitle for display
 */
function getVendorSubtitle(vendor: VendorRecord): string {
  if (vendor.boothNumber) {
    return `Booth ${vendor.boothNumber}`
  }
  if (vendor.contactName) {
    return vendor.contactName
  }
  if (vendor.email) {
    return vendor.email
  }
  return ''
}

interface SortableVendorItemProps {
  vendor: VendorRecord
  onEditVendor?: (vendor: VendorRecord) => void
  onVendorClick?: (vendor: VendorRecord) => void
}

function SortableVendorItem({ vendor, onEditVendor, onVendorClick }: SortableVendorItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: vendor.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 touch-none min-w-[36px] min-h-[36px] flex items-center justify-center cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <SwipeActions
          key={vendor.id}
          onEdit={onEditVendor ? () => onEditVendor(vendor) : undefined}
        >
          <EntityCard
            title={vendor.companyName}
            subtitle={getVendorSubtitle(vendor)}
            badge={vendor.status === 'archived' ? { label: 'Archived', variant: 'archived' } : undefined}
            countChip={vendor.styleCount !== undefined ? `${vendor.styleCount} ${vendor.styleCount === 1 ? 'style' : 'styles'}` : undefined}
            leadingIcon={<Building2 className="w-5 h-5" />}
            onPress={() => onVendorClick?.(vendor)}
            actions={[
              ...(onEditVendor ? [{
                label: 'Edit',
                icon: <Pencil className="w-[18px] h-[18px]" />,
                onPress: () => onEditVendor(vendor),
              }] : []),
              {
                label: 'Archive',
                icon: <Archive className="w-[18px] h-[18px]" />,
                onPress: () => {
                  // Archive action - to be implemented
                },
              },
            ]}
            testId={`vendor-card-${vendor.id}`}
          />
        </SwipeActions>
      </div>
    </div>
  )
}
