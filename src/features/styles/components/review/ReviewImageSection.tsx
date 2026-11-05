/**
 * Style Review Image Section Components
 *
 * Extracted from StyleReviewScreen for maintainability.
 * Contains the hero image display and thumbnail strip.
 */

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge } from '@/components/ui'
import type { CaptureImage } from '@/types/capture'

/**
 * Hero image with badges indicating Info/Primary status
 */
export function HeroImage({
  image,
  isInfoImage,
}: {
  image: CaptureImage
  isInfoImage: boolean
}) {
  return (
    <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden shadow-lg border-2 border-primary/20 bg-muted">
      <img
        src={image.uri}
        alt="Style image"
        className="w-full h-full object-cover"
      />
      <div className="absolute top-3 right-3 flex gap-2">
        {isInfoImage && (
          <Badge className="gap-1 bg-primary text-primary-foreground text-xs">
            <Sparkles className="h-3 w-3" />
            Info
          </Badge>
        )}
        <Badge className="bg-primary text-primary-foreground text-xs">
          Primary
        </Badge>
      </div>
    </div>
  )
}

/**
 * Horizontal thumbnail strip for selecting the hero image
 */
export function ThumbnailStrip({
  images,
  selectedImageId,
  onImageSelect,
}: {
  images: CaptureImage[]
  selectedImageId: string | undefined
  onImageSelect: (image: CaptureImage) => void
}) {
  if (images.length <= 1) {return null}

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {images.map((img, index) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onImageSelect(img)}
          aria-label={`View image ${index + 1}`}
          aria-pressed={img.id === selectedImageId}
          className={cn(
            "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 bg-muted transition-all",
            img.id === selectedImageId ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
          )}
        >
          <img
            src={img.uri}
            alt={img.caption || 'Style image'}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  )
}
