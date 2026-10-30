/**
 * BulkActionsBar Component
 *
 * Sticky bottom bar that appears when items are selected,
 * offering bulk operations like archive, export, tag, etc.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export type BulkAction =
  | 'archive'
  | 'export'
  | 'updateCategory'
  | 'updateSeason'
  | 'updateStatus'
  | 'tag'

interface BulkActionsBarProps {
  /** Number of selected items */
  selectedCount: number
  /** Available actions based on entity type */
  availableActions: BulkAction[]
  /** Callback when an action is triggered */
  onAction: (action: BulkAction, params?: Record<string, unknown>) => void
  /** Callback to clear selection */
  onClearSelection: () => void
  /** Whether an action is in progress */
  isLoading?: boolean
}

const ACTION_LABELS: Record<BulkAction, string> = {
  archive: 'Archive',
  export: 'Export CSV',
  updateCategory: 'Update Category',
  updateSeason: 'Update Season',
  updateStatus: 'Update Status',
  tag: 'Add Tags',
}

export function BulkActionsBar({
  selectedCount,
  availableActions,
  onAction,
  onClearSelection,
  isLoading = false,
}: BulkActionsBarProps) {
  const handleActionClick = (action: BulkAction) => {
    if (action === 'archive') {
      // Use browser confirm for destructive actions
      if (confirm(`Archive ${selectedCount} items?`)) {
        onAction(action)
      }
    } else if (action === 'export') {
      onAction(action)
    } else {
      // For other actions, would typically open a modal/dialog
      onAction(action)
    }
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-lg">
      <div className="container max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Selection Count */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-2.5 py-1">
              {selectedCount} selected
            </Badge>
            <button
              onClick={onClearSelection}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {availableActions.map((action) => (
              <Button
                key={action}
                variant={action === 'archive' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => handleActionClick(action)}
                disabled={isLoading}
              >
                {ACTION_LABELS[action]}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to manage bulk selection state
 */
export function useBulkSelection<T extends string>(totalItems: number) {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set())

  const toggleSelection = (id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isSelected = (id: T) => selectedIds.has(id)

  const selectAll = () => {
    // Note: This would need the actual IDs to select all
    // For now, it's a placeholder
  }

  const clearSelection = () => setSelectedIds(new Set())

  const selectedCount = selectedIds.size
  const hasSelection = selectedCount > 0
  const isAllSelected = selectedCount === totalItems && totalItems > 0
  const isSomeSelected = hasSelection && !isAllSelected

  return {
    selectedIds: Array.from(selectedIds),
    toggleSelection,
    isSelected,
    selectAll,
    clearSelection,
    selectedCount,
    hasSelection,
    isAllSelected,
    isSomeSelected,
  }
}
