import { useState, useEffect } from 'react'
import { DollarSign } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { getVendorPriceHistory, type VendorPriceEntry } from '../api/getVendorPriceHistory'
import { convertPriceForDisplay } from '@/utils/priceDisplay'

interface EventPriceGroup {
  eventName: string | null
  latestPrice: VendorPriceEntry
}

export function VendorPriceComparisonSection({ vendorId }: { vendorId: string }) {
  const [prices, setPrices] = useState<VendorPriceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getVendorPriceHistory(vendorId)
      .then((data) => {
        if (!cancelled) {
          setPrices(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [vendorId])

  const groupedByEvent = prices.reduce<Map<string, EventPriceGroup>>((map, entry) => {
    if (!map.has(entry.eventId)) {
      map.set(entry.eventId, { eventName: entry.eventName, latestPrice: entry })
    }
    return map
  }, new Map())

  if (loading) {
    return (
      <SectionContainer title="Price Across Events" icon={<DollarSign className="h-5 w-5" />}>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse flex items-center justify-between py-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-4 bg-muted rounded w-1/6" />
            </div>
          ))}
        </div>
      </SectionContainer>
    )
  }

  if (error) {
    return (
      <SectionContainer title="Price Across Events" icon={<DollarSign className="h-5 w-5" />}>
        <p className="text-sm text-destructive">{error}</p>
      </SectionContainer>
    )
  }

  if (groupedByEvent.size === 0) {
    return (
      <SectionContainer title="Price Across Events" icon={<DollarSign className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground italic">No pricing data recorded.</p>
      </SectionContainer>
    )
  }

  return (
    <SectionContainer title="Price Across Events" icon={<DollarSign className="h-5 w-5" />}>
      <div className="space-y-2">
        {Array.from(groupedByEvent.entries()).map(([eventId, group]) => {
          const { displayPrice, displayUnit } = convertPriceForDisplay(
            group.latestPrice.price,
            group.latestPrice.price_unit
          )
          return (
            <div
              key={eventId}
              className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
            >
              <span className="text-sm font-medium text-foreground">
                {group.eventName ?? 'Unknown Event'}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(group.latestPrice.createdAt).toLocaleDateString()}
              </span>
              <span className="text-sm font-semibold text-foreground">
                {group.latestPrice.currency} {displayPrice.toFixed(2)} / {displayUnit}
              </span>
            </div>
          )
        })}
      </div>
    </SectionContainer>
  )
}
