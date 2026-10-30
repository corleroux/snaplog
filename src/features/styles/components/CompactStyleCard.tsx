/**
 * Compact Style Card
 *
 * Lightweight style preview card for use in related-styles sections.
 * Designed to be visual but compact, suitable for horizontal lists or
 * stacked cards on vendor detail screens.
 *
 * DESIGN PRINCIPLES:
 * - Visual but lighter treatment than full StyleCard
 * - Shows style image thumbnail
 * - Shows style name
 * - Shows 1-2 key attributes (composition, color)
 * - Tap to open Style Detail
 * - Premium dark mobile-first consistency
 *
 * FEATURES:
 * - Style thumbnail image
 * - Style name
 * - Quick attributes (composition, color)
 * - Link to style detail
 * - Empty state handling
 * - Navigation context preservation for back button
 */

import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils/cn'
import type { StyleRecord } from '@/types/style'

export interface CompactStyleCardProps {
  /** The style to display */
  style: StyleRecord
  /** Base path for navigation (includes eventId and vendorId) */
  basePath: string
  /** Additional className */
  className?: string
}

/**
 * Navigation state for preserving entry context
 */
interface StyleDetailNavigationState {
  /** Whether style detail was entered from vendor context */
  fromVendor?: boolean
  /** Vendor ID if entered from vendor detail */
  vendorId?: string
  /** Event ID for navigation */
  eventId?: string
}

/**
 * Compact style card component
 *
 * Displays a lightweight style preview suitable for related-styles sections.
 * Aligned with design system: premium surfaces, warm accent, subtle depth.
 *
 * @example
 * ```tsx
 * <CompactStyleCard
 *   style={style}
 *   basePath={`/events/${eventId}/vendors/${vendorId}`}
 * />
 * ```
 */
export function CompactStyleCard({
  style,
  basePath,
  className,
}: CompactStyleCardProps) {
  // Get the thumbnail image (first image or source info image)
  const thumbnailImage = style.images.find(
    (img) => img.id === style.sourceInfoImageId
  ) || style.images[0]

  // Extract vendorId and eventId from basePath for navigation state
  // basePath format: /events/:eventId/vendors/:vendorId
  const pathParts = basePath.split('/')
  const eventIdIndex = pathParts.indexOf('events')
  const eventId = eventIdIndex >= 0 && eventIdIndex + 1 < pathParts.length ? pathParts[eventIdIndex + 1] : undefined
  const vendorIdIndex = pathParts.indexOf('vendors')
  const vendorId = vendorIdIndex >= 0 && vendorIdIndex + 1 < pathParts.length ? pathParts[vendorIdIndex + 1] : undefined

  // Navigation state to preserve context
  const navigationState: StyleDetailNavigationState = {
    fromVendor: !!vendorId,
    vendorId: vendorId,
    eventId: eventId,
  }

  return (
    <Link
      to={`${basePath}/styles/${style.id}`}
      state={navigationState}
      className={cn(
        'flex gap-3 p-3 bg-card rounded-xl border border-border/80 hover:border-orange-500/50 hover:bg-accent/5 hover:shadow-md hover:shadow-orange-500/5 transition-all duration-200 active:scale-[0.98] group',
        className
      )}
    >
      {/* Thumbnail image - refined with subtle shadow */}
      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted border border-border/50 shadow-sm">
        {thumbnailImage ? (
          <img
            src={thumbnailImage.uri}
            alt={style.styleName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-950/30 via-gray-900 to-orange-900/20 relative overflow-hidden">
            {/* Fabric pattern overlay for texture */}
            <div className="absolute inset-0 opacity-[0.05]">
              <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <pattern id="compact-fabric-pattern" patternUnits="userSpaceOnUse" width="10" height="10">
                  <circle cx="5" cy="5" r="1.5" fill="currentColor" className="text-orange-500" />
                </pattern>
                <rect width="100" height="100" fill="url(#compact-fabric-pattern)" />
              </svg>
            </div>
            <svg
              className="w-6 h-6 text-orange-500/30 relative z-10"
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

      {/* Style info - refined typography hierarchy */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Style name - enhanced hover state */}
        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-orange-600 dark:group-hover:text-orange-500 transition-colors duration-200">
          {style.styleName}
        </h3>

        {/* Quick attributes - refined spacing */}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {style.composition && (
            <span className="text-xs text-muted-foreground truncate">
              {style.composition}
            </span>
          )}
          {style.color && style.composition && (
            <span className="text-xs text-muted-foreground/40">•</span>
          )}
          {style.color && (
            <span className="text-xs text-muted-foreground truncate">
              {style.color}
            </span>
          )}
        </div>

        {/* Optional: SKU if available - refined styling */}
        {style.sku && (
          <p className="text-xs text-muted-foreground/60 font-mono mt-0.5">
            {style.sku}
          </p>
        )}
      </div>

      {/* Chevron indicator - refined animation */}
      <div className="flex-shrink-0 flex items-center">
        <svg
          className="w-4 h-4 text-muted-foreground/40 group-hover:text-orange-500/80 group-hover:translate-x-0.5 transition-all duration-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  )
}

/**
 * Props for the related styles section
 */
export interface RelatedStylesSectionProps {
  /** Styles to display */
  styles: StyleRecord[]
  /** Base path for navigation (includes eventId and vendorId) */
  basePath: string
  /** Title for the section */
  title?: string
  /** Empty state message */
  emptyMessage?: string
  /** Whether to show a CTA in empty state */
  showEmptyCTA?: boolean
  /** CTA text for empty state */
  emptyCTAText?: string
  /** Callback for empty state CTA */
  onEmptyCTA?: () => void
  /** Additional className */
  className?: string
}

/**
 * Related styles section component
 *
 * Displays a list of related styles with refined empty state handling.
 * Aligned with design system: intentional empty states, clear CTAs.
 *
 * @example
 * ```tsx
 * <RelatedStylesSection
 *   styles={vendorStyles}
 *   basePath={`/events/${eventId}/vendors/${vendorId}`}
 *   emptyMessage="No styles yet for this vendor"
 *   showEmptyCTA
 *   emptyCTAText="Add Style"
 *   onEmptyCTA={() => navigateToAddStyle()}
 * />
 * ```
 */
export function RelatedStylesSection({
  styles,
  basePath,
  title = 'Styles',
  emptyMessage = 'No styles yet',
  showEmptyCTA = false,
  emptyCTAText = 'Add Style',
  onEmptyCTA,
  className,
}: RelatedStylesSectionProps) {
  if (styles.length === 0) {
    return (
      <div className={cn('text-center py-10', className)}>
        {/* Refined empty state with premium treatment */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-950/20 via-orange-900/10 to-gray-900/20 border border-orange-500/10 mb-4 shadow-sm">
          <svg
            className="w-8 h-8 text-orange-500/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground mb-1">{emptyMessage}</p>
        <p className="text-xs text-muted-foreground/60">
          Capture styles to link them to this vendor
        </p>
        {showEmptyCTA && onEmptyCTA && (
          <button
            type="button"
            onClick={onEmptyCTA}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-full transition-colors duration-200 shadow-md shadow-orange-500/20 hover:shadow-orange-500/30"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {emptyCTAText}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      )}
      {styles.map((style) => (
        <CompactStyleCard
          key={style.id}
          style={style}
          basePath={basePath}
        />
      ))}
    </div>
  )
}
