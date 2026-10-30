import { useState } from 'react'
import { Modal } from '@/components/ui'
import { Button } from '@/components/ui'

interface AddPriceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    currency: string
    price: number
    price_unit: string
    moq?: number
    moq_unit?: string
    lead_time_value?: number
    lead_time_unit?: string
  }) => void | Promise<void>
  isSubmitting?: boolean
}

export function AddPriceModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: AddPriceModalProps) {
  const [currency, setCurrency] = useState('USD')
  const [price, setPrice] = useState<string>('')
  const [priceUnit, setPriceUnit] = useState('meter')
  const [moq, setMoq] = useState<string>('')
  const [moqUnit, setMoqUnit] = useState('meter')
  const [leadTimeValue, setLeadTimeValue] = useState<string>('')
  const [leadTimeUnit, setLeadTimeUnit] = useState('days')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = parseFloat(price)
    if (isNaN(p)) return
    
    onSubmit({
      currency,
      price: p,
      price_unit: priceUnit,
      moq: moq ? parseFloat(moq) : undefined,
      moq_unit: moq ? moqUnit : undefined,
      lead_time_value: leadTimeValue ? parseInt(leadTimeValue, 10) : undefined,
      lead_time_unit: leadTimeValue ? leadTimeUnit : undefined,
    })
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setCurrency('USD')
      setPrice('')
      setPriceUnit('meter')
      setMoq('')
      setMoqUnit('meter')
      setLeadTimeValue('')
      setLeadTimeUnit('days')
      onClose()
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Price Entry"
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
            disabled={isSubmitting || !price}
            type="button"
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Adding...' : 'Add Price'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Currency + Price */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CNY">CNY</option>
              <option value="INR">INR</option>
              <option value="JPY">JPY</option>
              <option value="KRW">KRW</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Price *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
          </div>
        </div>

        {/* Price Unit */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Price Unit
          </label>
          <select
            value={priceUnit}
            onChange={(e) => setPriceUnit(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          >
            <option value="meter">per meter</option>
            <option value="yard">per yard</option>
            <option value="kg">per kg</option>
            <option value="roll">per roll</option>
          </select>
        </div>

        {/* MOQ */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              MOQ
            </label>
            <input
              type="number"
              value={moq}
              onChange={(e) => setMoq(e.target.value)}
              placeholder="Min. Order"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              MOQ Unit
            </label>
            <select
              value={moqUnit}
              onChange={(e) => setMoqUnit(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="meter">meters</option>
              <option value="yard">yards</option>
              <option value="kg">kg</option>
              <option value="roll">rolls</option>
            </select>
          </div>
        </div>

        {/* Lead Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Lead Time
            </label>
            <input
              type="number"
              value={leadTimeValue}
              onChange={(e) => setLeadTimeValue(e.target.value)}
              placeholder="e.g., 4"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Time Unit
            </label>
            <select
              value={leadTimeUnit}
              onChange={(e) => setLeadTimeUnit(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <option value="days">days</option>
              <option value="weeks">weeks</option>
            </select>
          </div>
        </div>
      </form>
    </Modal>
  )
}
