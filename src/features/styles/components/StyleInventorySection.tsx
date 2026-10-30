import { Package as PackageIcon, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import type { InventoryRecord } from '@/lib/supabase/types'
import { AddInventoryModal } from './AddInventoryModal'
import { useState } from 'react'

interface StyleInventorySectionProps {
  inventory: InventoryRecord[]
  onAddRecord: (data: any) => Promise<void>
  isAddingRecord: boolean
}

/**
 * Get relative time string
 */
function getRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function StyleInventorySection({
  inventory,
  onAddRecord,
  isAddingRecord,
}: StyleInventorySectionProps) {
  const [addInventoryOpen, setAddInventoryOpen] = useState(false)

  const handleAddSubmit = async (data: any) => {
    await onAddRecord(data)
    setAddInventoryOpen(false)
  }

  return (
    <SectionContainer
      title={`Inventory${inventory.length > 0 ? ` (${inventory.length})` : ''}`}
      icon={<PackageIcon className="h-5 w-5" />}
    >
      {inventory.length > 0 ? (
        <div className="space-y-3 mb-3">
          {inventory.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {record.quantity} {record.unit}
                </p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {record.batch_no && <span>Batch: {record.batch_no}</span>}
                  <span>{getRelativeTime(record.captured_at)}</span>
                </div>
              </div>
              <StockStatusBadge status={record.stock_status ?? 'unknown'} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic mb-3">No inventory records yet.</p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAddInventoryOpen(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Record
      </Button>

      <AddInventoryModal
        isOpen={addInventoryOpen}
        onClose={() => setAddInventoryOpen(false)}
        onSubmit={handleAddSubmit}
        isSubmitting={isAddingRecord}
      />
    </SectionContainer>
  )
}

function StockStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    in_stock: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    low_stock: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    reserved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    sample_only: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    out_of_stock: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  const className = styles[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
  const label = status.replace('_', ' ')
  return (
    <span className={cn('text-xs px-2 py-1 rounded', className)}>
      {label}
    </span>
  )
}
