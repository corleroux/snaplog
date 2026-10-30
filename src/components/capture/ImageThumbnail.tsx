/**
 * Image Thumbnail Component for Capture Session
 *
 * Shows a single image with its classification state.
 * Supports visual indication of Info vs Gallery classification.
 *
 * DESIGN ALIGNED:
 * - Premium dark surfaces with warm orange accent for Info state
 * - Clear typography hierarchy
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent spacing and tokens
 */

import { type ReactNode } from 'react'
import { X, Sparkles, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { CaptureImage, ImageClassification } from '@/types/capture'
import { Badge } from '@/components/ui'

export interface ImageThumbnailProps {
  /** The capture image to display */
  image: CaptureImage
  /** Current classification state */
  classification: ImageClassification
  /** Whether this is the active/selected thumbnail */
  isActive?: boolean
  /** Whether to show the remove button */
  showRemove?: boolean
  /** Called when remove is clicked */
  onRemove?: (imageId: string) => void
  /** Called when thumbnail is clicked */
  onClick?: (imageId: string) => void
  /** Called when classification toggle is clicked */
  onToggleClassification?: (imageId: string) => void
  /** Optional custom content overlay */
  children?: ReactNode
  /** Additional className */
  className?: string
}

/**
 * Image thumbnail component for capture session
 *
 * Shows the image with visual indication of its classification:
 * - Info images have sparkle icon badge, orange ring, and warm accent
 * - Gallery images have neutral styling with subtle border
 * - Active/selected state has clear visual distinction
 */
export function ImageThumbnail({
  image,
  classification,
  isActive = false,
  showRemove = true,
  onRemove,
  onClick,
  onToggleClassification,
  children,
  className,
}: ImageThumbnailProps) {
  const isInfo = classification === 'info'

  return (
    <div
      className={cn(
        // Base styles - mobile-first touch-friendly sizing
        'relative group aspect-square rounded-xl overflow-hidden bg-muted',
        // Border styling - Info gets warm orange ring
        'border-2 transition-all cursor-pointer tap-target',
        isActive ? 'border-primary ring-2 ring-ring ring-offset-2' : 'border-border',
        isInfo && 'border-orange-500 shadow-lg shadow-orange-500/20',
        className
      )}
      onClick={() => onClick?.(image.id)}
    >
      {/* Image preview or placeholder */}
      {image.uri ? (
        <img
          src={image.uri}
          alt={image.caption || 'Captured image'}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Info badge - top left, prominent */}
      {isInfo && (
        <div className="absolute top-2 left-2">
          <Badge
            variant="accent"
            size="sm"
            className="gap-1 shadow-md bg-orange-500 text-white font-medium"
          >
            <Sparkles className="h-3 w-3" />
            Info
          </Badge>
        </div>
      )}

      {/* Active checkmark indicator - centered overlay */}
      {isActive && !isInfo && (
        <div className="absolute inset-0 bg-primary/30 backdrop-blur-[2px] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Remove button - top right, visible on hover */}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(image.id)
          }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 backdrop-blur-md text-foreground opacity-0 group-hover:opacity-100 transition-all hover:bg-background hover:scale-105 shadow-md"
          type="button"
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Classification toggle - bottom right, indicates Info state */}
      {onToggleClassification && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleClassification(image.id)
          }}
          className={cn(
            'absolute bottom-2 right-2 p-2 rounded-full backdrop-blur-md shadow-md transition-all',
            // Mobile-first: always visible, hover effect on desktop
            'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110',
            isInfo
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-background/90 text-foreground hover:bg-background'
          )}
          type="button"
          title={isInfo ? 'Change to Gallery image' : 'Set as Info image for extraction'}
          aria-label={isInfo ? 'Change to Gallery' : 'Set as Info'}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Custom overlay content */}
      {children}
    </div>
  )
}
