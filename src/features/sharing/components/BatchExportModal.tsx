/**
 * Batch Export Modal
 *
 * Modal component for batch exporting vendors or styles.
 * Allows selection of multiple items and export to CSV/Excel.
 */

import { useState } from 'react'
import { X, Download, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { exportVendorsToExcel, exportStylesToExcel } from '@/lib/export/excelExport'
import type { VendorRecord } from '@/types/vendor'
import type { StyleRecord } from '@/types/style'

export type ExportItem = VendorRecord | StyleRecord

// Helper function to get ID from export item
function getItemId(item: ExportItem): string {
  return (item as VendorRecord | StyleRecord).id
}

// Helper function to get display name from export item
function getItemDisplayName(item: ExportItem): string {
  if ('companyName' in item) {
    return item.companyName || `Vendor ${item.id.slice(0, 8)}`
  }
  if ('styleName' in item) {
    return item.styleName || `Style ${item.id.slice(0, 8)}`
  }
  return `Item ${(item as VendorRecord | StyleRecord).id.slice(0, 8)}`
}

export interface BatchExportModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Called when modal is closed */
  onClose: () => void
  /** Items available for export */
  items: ExportItem[]
  /** Type of items being exported */
  itemType: 'vendors' | 'styles'
  /** Optional title override */
  title?: string
}

interface SelectableItem {
  item: ExportItem
  isSelected: boolean
}

export function BatchExportModal({
  isOpen,
  onClose,
  items,
  itemType,
  title,
}: BatchExportModalProps) {
  const [selectableItems, setSelectableItems] = useState<SelectableItem[]>(
    items.map(item => ({ item, isSelected: false }))
  )
  const [exportMode, setExportMode] = useState<'single' | 'individual'>('single')
  const [isExporting, setIsExporting] = useState(false)
  const [exportedCount, setExportedCount] = useState(0)

  // Reset state when items change
  if (items.length !== selectableItems.length) {
    setSelectableItems(items.map(item => ({ item, isSelected: false })))
  }

  const selectedCount = selectableItems.filter(si => si.isSelected).length
  const allSelected = selectedCount === selectableItems.length && selectableItems.length > 0
  const someSelected = selectedCount > 0 && !allSelected

  const handleSelectAll = () => {
    setSelectableItems(prev =>
      prev.map(si => ({ ...si, isSelected: !allSelected }))
    )
  }

  const handleSelectItem = (id: string) => {
    setSelectableItems(prev =>
      prev.map(si =>
        getItemId(si.item) === id ? { ...si, isSelected: !si.isSelected } : si
      )
    )
  }

  const handleExport = async () => {
    setIsExporting(true)
    setExportedCount(0)

    const selectedItems = selectableItems
      .filter(si => si.isSelected)
      .map(si => si.item)

    try {
      if (exportMode === 'single') {
        // Export all selected items to a single file
        const timestamp = new Date().toISOString().slice(0, 10)
        const fileName = `${itemType}-export-${timestamp}`

        if (itemType === 'vendors') {
          exportVendorsToExcel(selectedItems as VendorRecord[], { fileName })
        } else {
          exportStylesToExcel(selectedItems as StyleRecord[], { fileName })
        }
        setExportedCount(selectedItems.length)
      } else {
        // Export each selected item to an individual file
        const timestamp = new Date().toISOString().slice(0, 10)

        for (const item of selectedItems) {
          const itemName = getItemDisplayName(item).replace(/[^a-z0-9]/gi, '-').toLowerCase()
          const fileName = `${itemType}-${itemName}-${timestamp}`

          if (itemType === 'vendors') {
            exportVendorsToExcel([item] as VendorRecord[], { fileName })
          } else {
            exportStylesToExcel([item] as StyleRecord[], { fileName })
          }

          setExportedCount(prev => prev + 1)
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden bg-background rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {title || `Batch Export ${itemType === 'vendors' ? 'Vendors' : 'Styles'}`}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Selection controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected
                  }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-sm">
                  {allSelected ? 'All selected' : someSelected ? `${selectedCount} selected` : 'Select all'}
                </span>
              </label>
              <span className="text-sm text-muted-foreground">
                {selectedCount} of {selectableItems.length} selected
              </span>
            </div>
          </div>

          {/* Export mode */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Export Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportMode('single')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  exportMode === 'single'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                Single File
              </button>
              <button
                onClick={() => setExportMode('individual')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  exportMode === 'individual'
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                Individual Files
              </button>
            </div>
          </div>

          {/* Item list */}
          <div className="border rounded-md divide-y max-h-60 overflow-auto">
            {selectableItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No items to export
              </div>
            ) : (
              selectableItems.map(({ item, isSelected }) => (
                <label
                  key={getItemId(item)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectItem(getItemId(item))}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="flex-1 text-sm truncate">
                    {getItemDisplayName(item)}
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </label>
              ))
            )}
          </div>

          {/* Export success message */}
          {exportedCount > 0 && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md">
              <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-200">
                <Check className="w-4 h-4" />
                <span>
                  {exportMode === 'single'
                    ? `Exported ${exportedCount} items to single file`
                    : `Exported ${exportedCount} individual files`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/30">
          <Button variant="ghost" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={selectedCount === 0 || isExporting}
            className="gap-2"
          >
            {isExporting ? (
              <>
                <span className="animate-spin">⏳</span>
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {selectedCount} {selectedCount === 1 ? 'item' : 'items'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to control batch export modal
 */
export function useBatchExportModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [items, setItems] = useState<ExportItem[]>([])
  const [itemType, setItemType] = useState<'vendors' | 'styles'>('vendors')

  const open = (newItems: ExportItem[], type: 'vendors' | 'styles') => {
    setItems(newItems)
    setItemType(type)
    setIsOpen(true)
  }

  const close = () => setIsOpen(false)

  return {
    isOpen,
    items,
    itemType,
    open,
    close,
  }
}
