import { useState } from 'react'
import { Modal } from '@/components/ui'
import { Button } from '@/components/ui'

interface AddInventoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    quantity: number
    unit: string
    batchNo: string
    stockStatus: 'in_stock' | 'low_stock' | 'reserved' | 'sample_only' | 'out_of_stock'
  }) => void | Promise<void>
  isSubmitting?: boolean
}

export function AddInventoryModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddInventoryModalProps) {
  const [quantity, setQuantity] = useState<string>('')
  const [unit, setUnit] = useState('meters')
  const [batchNo, setBatchNo] = useState('')
  const [stockStatus, setStockStatus] = useState<'in_stock' | 'low_stock' | 'reserved' | 'sample_only' | 'out_of_stock'>('in_stock')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = parseFloat(quantity)
    if (isNaN(q)) return
    
    onSubmit({
      quantity: q,
      unit,
      batchNo,
      stockStatus,
    })
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setQuantity('')
      setUnit('meters')
      setBatchNo('')
      setStockStatus('in_stock')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Inventory Record"
      size="sm"
      placement="top"
      showClose={!isSubmitting}
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            type="button"
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleSubmit as any}
            disabled={isSubmitting || !quantity}
            type="button"
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Adding...' : 'Add Record'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Quantity *
            </label>
            <input
              type="number"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Unit
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="meters">meters</option>
              <option value="yards">yards</option>
              <option value="kg">kg</option>
              <option value="rolls">rolls</option>
            </select>
          </div>
        </div>

        {/* Batch No */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Batch No
          </label>
          <input
            type="text"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder="e.g., B2025-01"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        {/* Stock Status */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Stock Status
          </label>
          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value as any)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="sample_only">Sample Only</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>
      </form>
    </Modal>
  )
}
