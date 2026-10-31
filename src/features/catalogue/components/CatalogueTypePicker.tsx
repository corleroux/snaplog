/**
 * Catalogue type picker (FR-SCH-05).
 *
 * Lets the buyer choose what they are cataloguing. Fabric and vendor hand
 * off to the existing flows; garments continue in the schema-driven flow;
 * rack video links to the FR-VID flow. The options render from the registry
 * rows — adding a category needs no code change here.
 */

import { useCallback, useEffect, useState } from 'react'
import { Shirt, Layers, Store, Video, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { SectionContainer } from '@/components/ui/section-container'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  getCatalogueTypes,
  PICKER_ORDER,
  type CatalogueTypeDefinition,
} from '../api/catalogueRegistry'

export type PickerSelection =
  | { kind: 'existing'; slug: 'fabric' | 'vendor' }
  | { kind: 'catalogue'; definition: CatalogueTypeDefinition }
  | { kind: 'video' }

export interface CatalogueTypePickerProps {
  onSelect: (selection: PickerSelection) => void
  className?: string
}

const ICONS: Record<string, typeof Shirt> = {
  fabric: Layers,
  garment: Shirt,
  vendor: Store,
}

function optionFor(def: CatalogueTypeDefinition) {
  if (def.slug === 'fabric' || def.slug === 'vendor') {
    return { kind: 'existing', slug: def.slug } as PickerSelection
  }
  return { kind: 'catalogue', definition: def } as PickerSelection
}

export function CatalogueTypePicker({ onSelect, className }: CatalogueTypePickerProps) {
  const [types, setTypes] = useState<CatalogueTypeDefinition[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(null)
    setTypes(null)
    let cancelled = false
    getCatalogueTypes()
      .then((rows) => {
        if (!cancelled) {setTypes(rows)}
      })
      .catch((err) => {
        if (!cancelled) {setError(err instanceof Error ? err.message : 'Failed to load catalogue types')}
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => load(), [load])

  if (error) {
    return (
      <ErrorState
        title="Couldn't load catalogue types"
        message={error}
        onRetry={load}
        className={className}
      />
    )
  }

  if (!types) {
    return <LoadingState message="Loading catalogue types..." className={className} />
  }

  const options = types
    .filter((t) => t.kind === 'catalogue_type' || t.slug === 'vendor')
    .sort((a, b) => {
      const order = (slug: string) => {
        const index = PICKER_ORDER.indexOf(slug as (typeof PICKER_ORDER)[number])
        return index === -1 ? PICKER_ORDER.length : index
      }
      return order(a.slug) - order(b.slug)
    })

  if (options.length === 0) {
    return (
      <EmptyState
        title="No catalogue types"
        description="No active catalogue types are configured yet."
        className={className}
      />
    )
  }

  return (
    <SectionContainer
      title="What are you cataloguing?"
      description="The fields and review screen adapt to the type you pick"
      background="muted"
      className={className}
    >
      <ul className="space-y-2" aria-label="Catalogue type">
        {options
          .map((def) => {
            const Icon = ICONS[def.slug] ?? Shirt
            const selection = optionFor(def)
            return (
              <li key={def.slug}>
                <button
                  type="button"
                  aria-label={def.display_name}
                  onClick={() => onSelect(selection)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border border-border',
                    'bg-card hover:border-orange-500/50 active:scale-[0.99] transition-all',
                    'min-h-[56px] text-left'
                  )}
                >
                  <span className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-500/10 flex-shrink-0">
                    <Icon className="h-5 w-5 text-orange-500" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">{def.display_name}</span>
                    <span className="block text-xs text-muted-foreground truncate">
                      {def.schema.scan_types
                        ? Object.values(def.schema.scan_types)[0]
                        : `${def.kind === 'document' ? 'Document' : 'Item'} capture`}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              </li>
            )
          })}

        <li>
          <button
            type="button"
            aria-label="Rack video"
            onClick={() => onSelect({ kind: 'video' })}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-xl border border-border',
              'bg-card hover:border-orange-500/50 active:scale-[0.99] transition-all',
              'min-h-[56px] text-left'
            )}
          >
            <span className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-500/10 flex-shrink-0">
              <Video className="h-5 w-5 text-orange-500" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium">Rack video</span>
              <span className="block text-xs text-muted-foreground truncate">
                Walk a rail — items are isolated and catalogued individually
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        </li>
      </ul>
    </SectionContainer>
  )
}
