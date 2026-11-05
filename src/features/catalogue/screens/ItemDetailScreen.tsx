/**
 * Catalogue Item Detail Screen (FR-CAT-01).
 *
 * Read-only detail for garment/video catalogue items. Mirrors the
 * StyleDetailScreen structure (header, hero gallery, extraction notes,
 * details, variants, archive) minus fabric-only paths: no edit, no
 * shortlist, no approval, no comments/assignments/inventory/pricing/QR.
 */

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Archive, AlertTriangle, Shirt, Video as VideoIcon } from 'lucide-react'
import { Button } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { ImageLightbox } from '@/components/ui/ImageLightbox'
import { LoadingState, ErrorState } from '@/components/ui'
import { AppShell, PageHeader, BottomNavigation } from '@/components/layout'
import { SectionContainer } from '@/components/ui/section-container'
import type { FabricImage } from '@/lib/supabase/types'
import { StyleImageGallery } from '@/features/styles/components/StyleImageGallery'
import { ExtractionWarnings } from '@/features/styles/components/ExtractionWarnings'
import type { CatalogueItemDetailData } from '../hooks/useCatalogueItemDetail'

export interface ItemDetailScreenProps {
  data?: CatalogueItemDetailData | null
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onBack?: () => void
  onArchive?: () => void
  headerContent?: React.ReactNode
}

export function ItemDetailScreen({
  data,
  loading = false,
  error = null,
  onRefresh,
  onBack,
  onArchive,
  headerContent,
}: ItemDetailScreenProps) {
  const { eventId = '', vendorId = '' } = useParams()
  const [lightboxImage, setLightboxImage] = useState<number | null>(null)

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Item Details" onBack={onBack} />
        <main className="flex-1 px-4">
          <LoadingState message="Loading item details..." />
        </main>
      </AppShell>
    )
  }

  if (error || !data) {
    return (
      <AppShell>
        <PageHeader title="Item Details" onBack={onBack} />
        <div className="flex items-center justify-center min-h-screen bg-background">
          <ErrorState
            title="Failed to load item"
            message={error || 'Please try again.'}
            onRetry={onRefresh}
            icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
            customAction={
              <div className="flex gap-3 justify-center">
                {onRefresh && (
                  <button
                    onClick={onRefresh}
                    className="px-4 py-2 min-h-[44px] bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    Retry
                  </button>
                )}
                <Link to={`/events/${eventId}/vendors/${vendorId}/styles`}>
                  <button className="px-4 py-2 min-h-[44px] bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors">
                    Back to Items
                  </button>
                </Link>
              </div>
            }
          />
        </div>
      </AppShell>
    )
  }

  const { item, variants, imageUrls, definition, fields, warnings, needsReview } = data
  const itemName = item.name?.trim() || item.item_code || 'Untitled Item'
  const isVideo = item.schema_type === 'video'
  const TypeIcon = isVideo ? VideoIcon : Shirt

  // The gallery is typed for fabric images but only reads
  // id/public_url/is_primary/caption — safe to adapt catalogue URLs.
  const galleryImages = imageUrls.map(
    (url, index) =>
      ({
        id: `item-img-${index}`,
        public_url: url,
        is_primary: index === 0,
        caption: itemName,
      }) as unknown as FabricImage,
  )

  return (
    <AppShell>
      {headerContent || (
        <PageHeader
          title={itemName}
          subtitle={item.item_code}
          onBack={onBack}
          action={
            definition ? (
              <Badge variant="secondary" className="gap-1 text-sm flex-shrink-0 whitespace-nowrap">
                <TypeIcon className="h-4 w-4" />
                {definition.display_name} · v{definition.version}
              </Badge>
            ) : undefined
          }
        />
      )}

      <main className="flex-1 overflow-y-auto px-4 pt-3">
        <div className="space-y-6 pb-6">
          <StyleImageGallery
            images={galleryImages}
            styleName={itemName}
            onImageClick={(_url, index) => setLightboxImage(index)}
          />
          <ExtractionWarnings warnings={warnings} />
          {needsReview && warnings.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-field-warn border border-danger rounded-lg">
              <AlertTriangle className="h-4 w-4 text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">
                Needs review — verify the details below against the item photos.
              </p>
            </div>
          )}

          <SectionContainer title="Details">
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No details extracted yet.</p>
            ) : (
            <dl className="divide-y divide-border">
              {fields.map((field) => (
                <div key={field.label} className="flex items-start justify-between gap-4 py-2">
                  <dt className="text-sm text-muted-foreground shrink-0">{field.label}</dt>
                  <dd className="text-sm text-foreground text-right break-words min-w-0">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
            )}
          </SectionContainer>

          {variants.length > 0 && (
            <SectionContainer title="Variants & Colourways">
              <ul className="divide-y divide-border">
                {variants.map((variant) => {
                  const swatch = variant.colour_code && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(variant.colour_code)
                    ? variant.colour_code
                    : null
                  return (
                  <li key={variant.id} className="py-2 flex items-center gap-3">
                    {swatch && (
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 rounded-full border border-border flex-shrink-0"
                        style={{ backgroundColor: swatch }}
                      />
                    )}
                    <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {variant.variant_name || variant.colour_name || 'Variant'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[variant.colour_name, variant.colour_code, variant.sizing]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                    </div>
                  </li>
                  )
                })}
              </ul>
            </SectionContainer>
          )}

          <div className="text-center py-4 text-xs text-muted-foreground">
            Item ID: <span className="font-mono">{item.id}</span>
          </div>
          {onArchive && (
            <div className="pt-2 pb-4">
              <Button
                variant="ghost"
                onClick={onArchive}
                className="w-full text-destructive hover:bg-destructive/10"
                radius="pill"
                size="lg"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive Item
              </Button>
            </div>
          )}
        </div>
      </main>
      <ImageLightbox
        src={lightboxImage !== null ? imageUrls[lightboxImage] : null}
        alt={itemName || 'Item image'}
        isOpen={lightboxImage !== null}
        onClose={() => setLightboxImage(null)}
        images={imageUrls}
        initialIndex={lightboxImage ?? 0}
      />
      <BottomNavigation />
    </AppShell>
  )
}
