/**
 * Image Strip Component for Capture Session
 *
 * Displays all captured images in a horizontal scrollable strip.
 * Shows visual indication of Info vs Gallery classification.
 *
 * DESIGN ALIGNED:
 * - Premium dark surfaces with warm orange accent for Info state
 * - Clean horizontal scrolling with snap behavior
 * - Clear visual hierarchy and spacing
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { type ReactNode } from 'react'
import { Plus, Camera, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'
import { ImageThumbnail } from './ImageThumbnail'
import type { CaptureImage, ImageClassification } from '@/types/capture'

export interface ImageStripProps {
  /** All images in the session */
  images: CaptureImage[]
  /** ID of the Info image (null if none) */
  infoImageId: string | null
  /** ID of the currently selected/active thumbnail */
  activeImageId?: string | null
  /** Whether to show the "Add more" button */
  showAddButton?: boolean
  /** Called when an image is clicked */
  onImageClick?: (imageId: string) => void
  /** Called when an image is removed */
  onImageRemove?: (imageId: string) => void
  /** Called when classification is toggled */
  onClassificationToggle?: (imageId: string) => void
  /** Called when "Add more" is clicked */
  onAddMore?: () => void
  /** Additional className */
  className?: string
  /** Children to render instead of default add button */
  addButtonChildren?: ReactNode
}

/**
 * Image strip component for capture session
 *
 * Shows all captured images in a horizontal scrollable strip.
 * Info images indicated with orange border, badge, and ring.
 * Gallery images have neutral styling.
 * Add button with dashed border for visual affordance.
 */
export function ImageStrip({
  images,
  infoImageId,
  activeImageId,
  showAddButton = true,
  onImageClick,
  onImageRemove,
  onClassificationToggle,
  onAddMore,
  className,
  addButtonChildren,
}: ImageStripProps) {
  // Get classification for each image
  const getClassification = (imageId: string): ImageClassification => {
    return imageId === infoImageId ? 'info' : 'gallery'
  }

  // Empty state handling
  const isEmpty = images.length === 0

  return (
    <div className={cn('w-full', className)}>
      {/* Horizontal scrollable image strip */}
      <div className={cn(
        'flex gap-3 overflow-x-auto pb-3',
        // Scroll snap for better mobile experience
        'snap-x snap-mandatory',
        // Hide scrollbar but allow scrolling
        'scrollbar-hide',
        // Smooth scrolling
        'scroll-smooth'
      )}>
        {/* Empty state */}
        {isEmpty && (
          <div className="flex-shrink-0 w-full min-w-[200px] flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">
              No images yet
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first image to get started
            </p>
            {showAddButton && onAddMore && (
              <Button
                variant="accent"
                onClick={onAddMore}
                size="sm"
                type="button"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Image
              </Button>
            )}
          </div>
        )}

        {/* Render each image thumbnail */}
        {!isEmpty && images.map((image) => (
          <div
            key={image.id}
            className="flex-shrink-0 w-24 sm:w-28 snap-start"
          >
            <ImageThumbnail
              image={image}
              classification={getClassification(image.id)}
              isActive={activeImageId === image.id}
              showRemove={onImageRemove !== undefined}
              onRemove={onImageRemove}
              onClick={onImageClick}
              onToggleClassification={onClassificationToggle}
            />
          </div>
        ))}

        {/* Add more button - only show if there are images */}
        {showAddButton && onAddMore && !isEmpty && (
          <div className="flex-shrink-0 w-24 sm:w-28 snap-start">
            <Button
              variant="outline"
              onClick={onAddMore}
              className="w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border-dashed border-2 hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all"
              type="button"
              aria-label="Add more images"
            >
              {addButtonChildren || (
                <>
                  <Plus className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">Add</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Image count indicator - clear hierarchy */}
      {!isEmpty && (
        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground font-medium">
              {images.length} image{images.length !== 1 ? 's' : ''}
            </span>
            {infoImageId && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-orange-500 font-medium flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  1 Info image
                </span>
              </>
            )}
          </div>

          {/* Helper text - visible on all screen sizes */}
          <span className="text-xs text-muted-foreground">
            Tap to select • sparkle icon to set Info
          </span>
        </div>
      )}
    </div>
  )
}
