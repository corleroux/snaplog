/**
 * Premium Style Card
 *
 * Hero card for displaying styles in the Style list.
 *
 * DESIGN PRINCIPLES:
 * - Image-first, immersive presentation
 * - Clean image presentation, no overlays
 * - Large rounded corners with subtle elevation
 * - Strong visual hierarchy
 * - Distinctly richer than Vendor cards
 *
 * This is the hero visual entity of the app.
 */

import { useCallback } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import type { StyleRecord } from '@/types/style'
import { convertPriceForDisplay } from '@/utils/priceDisplay'

export interface StyleCardProps {
  /** The style to display */
  style: StyleRecord
  /** Callback when card is clicked */
  onClick?: (style: StyleRecord) => void
  /** Additional className */
  className?: string
  /** Callback to toggle shortlist */
  onToggleShortlist?: (styleId: string, value: boolean) => void
}

/**
 * Get relative time string (e.g., "2h ago", "1d ago")
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

/**
 * Extract category badge from composition
 * Returns a capitalized material type like "SILK", "LINEN", "COTTON"
 */
function extractCategoryBadge(composition: string): string | null {
  if (!composition) return null

  const upperComp = composition.toUpperCase()

  // Check for common materials
  const materials = ['SILK', 'LINEN', 'COTTON', 'WOOL', 'POLYESTER', 'RAYON', 'VISCOSE', 'HEMP', 'DENIM', 'VELVET', 'LEATHER', 'CASHMERE']

  for (const material of materials) {
    if (upperComp.includes(material)) {
      return material
    }
  }

  // Fallback: use first word if no match
  const firstWord = composition.split(',')[0].trim().toUpperCase()
  return firstWord.length <= 10 ? firstWord : null
}

/**
 * Premium style card component
 *
 * Displays an immersive, image-first card with:
 * - Large hero image with aspect ratio
 * - Dark gradient overlay for text readability
 * - Time pill in top-right corner
 * - Category badge
 * - Large style name
 * - Secondary descriptor
 * - Subtle hover animation
 *
 * @example
 * ```tsx
 * <StyleCard
 *   style={style}
 *   onClick={(style) => navigate(`/styles/${style.id}`)}
 * />
 * ```
 */
export function StyleCard({
  style,
  onClick,
  className,
  onToggleShortlist,
}: StyleCardProps) {
  const handleClick = useCallback(() => {
    onClick?.(style)
  }, [style, onClick])

  const handleShortlistToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleShortlist?.(style.id, !style.isShortlisted)
  }, [style.id, style.isShortlisted, onToggleShortlist])

  // Get the primary image (source info image or first image)
  const primaryImage = style.images.find(
    (img) => img.id === style.sourceInfoImageId
  ) || style.images[0]

  // Extract category from composition
  const categoryBadge = extractCategoryBadge(style.composition)

  // Build secondary descriptor from composition and color
  const secondaryDescriptor = [
    style.composition,
    style.color
  ].filter(Boolean).join(' • ')

  // Get relative time
  const timeAgo = getRelativeTime(style.createdAt)

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-2xl shadow-sm transition-all duration-300 bg-card border border-border/50',
        'hover:shadow-md hover:shadow-orange-500/10 active:scale-[0.98]',
        onClick && 'cursor-pointer tap-target',
        className
      )}
    >
      {/* Hero image area with aspect ratio */}
      <div className="relative aspect-[4/3] w-full bg-muted">

        {/* Image or fallback */}
        {primaryImage ? (
          <ImageWithFallback
            src={primaryImage.uri}
            alt={style.styleName}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-orange-500/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

      </div>

      {/* Card body - below image */}
      <div className="p-3 text-left">
        {/* Category badge + time pill row */}
        <div className="flex items-center justify-between mb-1.5">
          {categoryBadge ? (
            <Badge
              variant="accent"
              className="text-[10px] px-2 py-0.5 font-semibold tracking-wide"
            >
              {categoryBadge}
            </Badge>
          ) : <span />}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
            {onToggleShortlist && (
              <button
                type="button"
                onClick={handleShortlistToggle}
                className="tap-target"
                aria-label={style.isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
              >
                <Heart
                  className={cn(
                    'h-4 w-4 transition-colors',
                    style.isShortlisted
                      ? 'fill-rose-500 text-rose-500'
                      : 'text-muted-foreground'
                  )}
                />
              </button>
            )}
          </div>
        </div>

        {/* Style name */}
        <h3 className="text-base font-semibold text-foreground tracking-tight leading-tight mb-0.5">
          {style.styleName || 'Untitled Style'}
        </h3>

        {/* Secondary descriptor */}
        {secondaryDescriptor && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {secondaryDescriptor}
          </p>
        )}

        {/* Latest price */}
        {style.latestPrice && (() => {
          const { displayPrice, displayUnit } = convertPriceForDisplay(
            style.latestPrice.price,
            style.latestPrice.priceUnit
          )
          return (
            <p className="text-sm font-medium text-foreground mt-1.5">
              {style.latestPrice.currency} {displayPrice.toFixed(2)}{' '}
              <span className="text-xs text-muted-foreground font-normal">/ {displayUnit}</span>
            </p>
          )
        })()}
      </div>
    </button>
  )
}
