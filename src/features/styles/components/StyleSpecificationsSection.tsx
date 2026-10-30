import { Ruler } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge'
import type { FabricStyle } from '@/lib/supabase/types'

interface StyleSpecificationsSectionProps {
  style: FabricStyle
}

/**
 * Get relative time string (duplicated from StyleDetailScreen for now, 
 * ideally should be in a utility file)
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

export function StyleSpecificationsSection({ style }: StyleSpecificationsSectionProps) {
  return (
    <SectionContainer
      title="Specifications"
      icon={<Ruler className="h-5 w-5" />}
      rightAction={<ConfidenceBadge confidence={style.extraction_confidence} />}
    >
      <div className="space-y-3">
        {style.composition && (
          <DetailRow label="Composition" value={style.composition} />
        )}
        {style.category && (
          <DetailRow label="Category" value={style.category} />
        )}
        {style.construction && (
          <DetailRow label="Construction" value={style.construction} />
        )}
        {style.finish && (
          <DetailRow label="Finish" value={style.finish} />
        )}
        {style.width_cm && (
          <DetailRow label="Width" value={`${style.width_cm} cm`} />
        )}
        {style.width_in && (
          <DetailRow label="Width" value={`${style.width_in} in`} />
        )}
        {style.weight_gsm && (
          <DetailRow label="Weight" value={`${style.weight_gsm} gsm`} />
        )}
        {style.weight_ozsy && (
          <DetailRow label="Weight" value={`${style.weight_ozsy} oz/yd²`} />
        )}
        {style.pattern && (
          <DetailRow label="Pattern" value={style.pattern} />
        )}
        {style.season && (
          <DetailRow label="Season" value={style.season} />
        )}
        {style.supplier_ref && (
          <DetailRow label="Supplier Ref" value={style.supplier_ref} />
        )}
        {/* Always show Added timestamp */}
        <DetailRow label="Added" value={getRelativeTime(style.created_at)} fallback="Unknown" />
      </div>
      {/* Show message if no specifications */}
      {!style.composition && !style.category && !style.construction && !style.finish &&
       !style.width_cm && !style.width_in && !style.weight_gsm && !style.weight_ozsy &&
       !style.pattern && !style.season && !style.supplier_ref && (
        <p className="text-sm text-muted-foreground italic">No specifications available. Edit to add details.</p>
      )}
    </SectionContainer>
  )
}

function DetailRow({ label, value, fallback }: { label: string; value: string | number | null; fallback?: string }) {
  const displayValue = value || fallback
  if (!displayValue) return null
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{displayValue}</span>
    </div>
  )
}
