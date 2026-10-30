/**
 * Vendor Card Component
 *
 * Lightweight reference-oriented card for vendor list view.
 *
 * DESIGN ALIGNED:
 * - Lighter than product cards
 * - Reference-oriented, not image-dominant
 * - Premium surfaces with warm accent
 * - Clean scannable hierarchy
 * - Mobile-first touch-friendly sizing
 */

import { type ReactNode } from 'react'
import { Building2, MapPin, Mail, ChevronRight, Image as ImageIcon, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui/badge'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import type { VendorRecord } from '@/types/vendor'

export interface VendorCardProps {
  /** The vendor record to display */
  vendor: VendorRecord
  /** Callback when card is clicked */
  onClick?: (vendor: VendorRecord) => void
  /** Callback when edit icon is clicked */
  onEdit?: (vendor: VendorRecord) => void
  /** Optional custom content */
  children?: ReactNode
  /** Additional className */
  className?: string
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
 * Vendor card component for list view
 *
 * Shows:
 * - Company name (primary)
 * - Booth number badge
 * - Thumbnail or placeholder
 * - Contact or website
 * - Relative creation time
 * - Optional navigation chevron
 *
 * Designed to be lighter and more reference-oriented than product cards.
 */
export function VendorCard({
  vendor,
  onClick,
  onEdit,
  children,
  className,
}: VendorCardProps) {
  // Determine what to show as secondary info
  const secondaryInfo = vendor.contactName || vendor.email || vendor.website

  // Get thumbnail image or placeholder
  const thumbnailImage = vendor.images.length > 0 ? vendor.images[0] : null

  return (
    <button
      onClick={() => onClick?.(vendor)}
      className={cn(
        'w-full text-left',
        'bg-card hover:bg-muted/30',
        'border border-border hover:border-orange-500/30',
        'rounded-xl p-4 sm:p-5',
        'transition-all duration-300',
        'hover:shadow-md overflow-hidden',
        'active:scale-[0.98]',
        'group',
        onClick && 'cursor-pointer tap-target',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail or placeholder */}
        <div className="flex-shrink-0">
          {thumbnailImage ? (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted border border-border">
              <ImageWithFallback
                src={thumbnailImage.uri}
                alt={vendor.companyName}
                className="w-full h-full object-cover"
                width={64}
                height={64}
              />
            </div>
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-muted/50 border border-border flex items-center justify-center">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            {/* Company name */}
            <h3 className="text-base sm:text-lg font-semibold text-foreground truncate group-hover:text-orange-500 transition-colors">
              {vendor.companyName}
            </h3>

            {/* Action icons */}
            <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
              {onEdit && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(vendor)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      onEdit(vendor)
                    }
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </span>
              )}
              {onClick && (
                <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              )}
            </div>
          </div>

          {/* Booth number badge */}
          {vendor.boothNumber && (
            <div className="mb-2">
              <Badge variant="outline" className="text-xs font-medium">
                <MapPin className="h-3 w-3 mr-1" />
                {vendor.boothNumber}
              </Badge>
            </div>
          )}

          {/* Secondary info - contact or website */}
          {secondaryInfo && (
            <p className="text-sm text-muted-foreground truncate mb-2 flex items-center gap-1">
              {vendor.contactName && (
                <span>{vendor.contactName}</span>
              )}
              {!vendor.contactName && vendor.email && (
                <>
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{vendor.email}</span>
                </>
              )}
              {!vendor.contactName && !vendor.email && vendor.website && (
                <span className="truncate">{vendor.website.replace(/^https?:\/\//, '')}</span>
              )}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {/* Relative time */}
            <span>{getRelativeTime(vendor.createdAt)}</span>

            {/* Image count if any images */}
            {vendor.images.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {vendor.images.length}
                </span>
              </>
            )}

            {/* Extraction warning indicator */}
            {vendor.extractionMeta?.warnings && vendor.extractionMeta.warnings.length > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-500">Review needed</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Custom content */}
      {children}
    </button>
  )
}
