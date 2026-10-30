import { DollarSign, Plus, History } from 'lucide-react'
import { Button } from '@/components/ui'
import { SectionContainer } from '@/components/ui/section-container'
import type { PriceHistory } from '@/lib/supabase/types'
import { AddPriceModal } from './AddPriceModal'
import { useState } from 'react'
import { convertPriceForDisplay } from '@/utils/priceDisplay'

interface StylePricingSectionProps {
  prices: PriceHistory[]
  onAddPrice: (data: any) => Promise<void>
  isAddingPrice: boolean
}

function PriceSparkline({ prices }: { prices: PriceHistory[] }) {
  if (prices.length < 2) return null

  const displayPrices = [...prices].reverse().map(p => p.price)
  const min = Math.min(...displayPrices)
  const max = Math.max(...displayPrices)
  const range = max - min || 1
  const width = 100
  const height = 30
  const padding = 2

  const points = displayPrices.map((price, i) => {
    const x = padding + (i / (displayPrices.length - 1)) * (width - padding * 2)
    const y = height - padding - ((price - min) / range) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-8 mb-2" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary"
      />
    </svg>
  )
}

export function StylePricingSection({
  prices,
  onAddPrice,
  isAddingPrice,
}: StylePricingSectionProps) {
  const [addPriceOpen, setAddPriceOpen] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleAddSubmit = async (data: any) => {
    await onAddPrice(data)
    setAddPriceOpen(false)
  }

  return (
    <SectionContainer
      title="Pricing"
      icon={<DollarSign className="h-5 w-5" />}
    >
      {prices.length > 0 ? (() => {
        const price = prices[0]
        const converted = convertPriceForDisplay(price.price, price.price_unit)
        return (
          <>
            <div className="p-3 rounded-lg border border-border mb-3">
              <p className="font-medium text-sm">
                {price.currency} {converted.displayPrice.toFixed(2)} / {converted.displayUnit}
              </p>
              {price.minimum_order_quantity && (
                <p className="text-xs text-muted-foreground">
                  MOQ: {price.minimum_order_quantity}{' '}
                  {price.minimum_order_unit || price.price_unit}
                </p>
              )}
              {price.lead_time_value && (
                <p className="text-xs text-muted-foreground">
                  Lead time: {price.lead_time_value} {price.lead_time_unit || 'days'}
                </p>
              )}
            </div>

            {prices.length > 1 && (
              <>
                <PriceSparkline prices={prices} />

                <button
                  type="button"
                  onClick={() => setShowHistory(s => !s)}
                  className="text-xs text-muted-foreground flex items-center gap-1 mt-2 mb-2"
                >
                  <History className="h-3 w-3" />
                  {showHistory ? 'Hide history' : `Show history (${prices.length - 1} more)`}
                </button>

                {showHistory && (
                  <div className="space-y-2 mb-3">
                    {prices.slice(1).map((p) => {
                      const c = convertPriceForDisplay(p.price, p.price_unit)
                      return (
                        <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                          <span className="text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString()}
                          </span>
                          <span className="font-medium">
                            {p.currency} {c.displayPrice.toFixed(2)} / {c.displayUnit}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )
      })() : (
        <p className="text-sm text-muted-foreground italic mb-3">No price recorded yet.</p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setAddPriceOpen(true)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1.5" />
        Add Price
      </Button>

      <AddPriceModal
        isOpen={addPriceOpen}
        onClose={() => setAddPriceOpen(false)}
        onSubmit={handleAddSubmit}
        isSubmitting={isAddingPrice}
      />
    </SectionContainer>
  )
}
