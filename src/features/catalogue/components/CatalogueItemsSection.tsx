/**
 * Catalogue items section for the vendor page (FR-SCH-05b).
 *
 * Reads `catalogue_items` by vendor — garments and video-isolated items live
 * here, while fabric stays on `fabric_styles` via the legacy list. Exactly one
 * lane per category, no duplication.
 *
 * Isolated on purpose (own fetch, own markup, no fabric assumptions) so the
 * DES-02C2 reskin can port it cleanly. Renders nothing when the vendor has no
 * catalogue items, leaving legacy vendor pages visually untouched.
 */

import { useEffect, useState } from 'react'
import { Shirt, AlertTriangle, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import { SectionContainer } from '@/components/ui/section-container'
import { Badge } from '@/components/ui'
import { LoadingState } from '@/components/ui/LoadingState'
import { missingRatio, REVIEW_MISSING_RATIO } from '../api/missingFields'

const logger = createLogger('CatalogueItemsSection')

export interface CatalogueItemRow {
  id: string
  item_code: string
  name: string | null
  schema_type: string
  schema_version: number
  extracted_fields: Record<string, unknown>
  created_at: string
}

export interface CatalogueItemsSectionProps {
  vendorId: string
  className?: string
}

function summaryLine(item: CatalogueItemRow): string | null {
  const fields = item.extracted_fields ?? {}
  const root = (fields.item ?? fields) as Record<string, unknown>
  const parts: string[] = []
  if (typeof root.garment_type === 'string' && root.garment_type) {parts.push(root.garment_type)}
  if (typeof root.fit === 'string' && root.fit) {parts.push(root.fit)}
  if (typeof root.sizing === 'string' && root.sizing) {parts.push(`Size ${root.sizing}`)}
  return parts.length > 0 ? parts.join(' · ') : null
}

export function CatalogueItemsSection({ vendorId, className }: CatalogueItemsSectionProps) {
  const [items, setItems] = useState<CatalogueItemRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    supabase
      .from('catalogue_items')
      .select('id, item_code, name, schema_type, schema_version, extracted_fields, created_at')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })
      .then(({ data, error: fetchError }) => {
        if (cancelled) {return}
        if (fetchError) {
          logger.error('Failed to load catalogue items', { error: fetchError.message })
          setError(fetchError.message)
          setItems([])
          return
        }
        setItems((data ?? []) as CatalogueItemRow[])
      })
    return () => {
      cancelled = true
    }
  }, [vendorId])

  if (items === null) {
    return <LoadingState message="Loading items..." className={className} />
  }

  if (error || items.length === 0) {
    // Silent when empty/broken: legacy pages keep their exact look, and a
    // failed items query must never block the vendor page.
    return null
  }

  return (
    <SectionContainer
      title="Items"
      description="Garments and video-isolated items"
      background="muted"
      className={className}
    >
      <ul className="space-y-2">
        {items.map((item) => {
          const needsReview = missingRatio(item.extracted_fields ?? {}) > REVIEW_MISSING_RATIO
          const summary = summaryLine(item)
          return (
            <li
              key={item.id}
              data-item-id={item.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card min-h-[56px]"
            >
              <span className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-500/10 flex-shrink-0" aria-hidden="true">
                <Shirt className="h-5 w-5 text-orange-500" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">
                  {item.name || item.item_code}
                </span>
                {summary && (
                  <span className="block text-xs text-muted-foreground truncate">{summary}</span>
                )}
              </span>
              {needsReview ? (
                <Badge variant="outline" className="gap-1 text-xs text-amber-700 dark:text-amber-400 border-amber-500/40 flex-shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Review
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs flex-shrink-0">
                  <Sparkles className="h-3 w-3" />
                  AI Extracted
                </Badge>
              )}
            </li>
          )
        })}
      </ul>
    </SectionContainer>
  )
}
