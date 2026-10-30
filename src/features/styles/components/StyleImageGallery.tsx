import { Palette, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ImageWithFallback } from '@/components/ui/ImageWithFallback'
import type { FabricImage } from '@/lib/supabase/types'

interface StyleImageGalleryProps {
  images: FabricImage[]
  styleName: string
  onImageClick: (url: string, index: number) => void
}

export function StyleImageGallery({
  images,
  styleName,
  onImageClick,
}: StyleImageGalleryProps) {
  // Get primary image or use placeholder
  const primaryImage = images.find((img) => img.is_primary) || images[0] || null
  const primaryIndex = primaryImage ? images.indexOf(primaryImage) : 0

  return (
    <div className="space-y-4">
      {/* Primary image hero - image-first design */}
      <div
        className={cn(
          "w-full aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden bg-muted border border-border shadow-md",
          primaryImage?.public_url && "cursor-pointer active:scale-[0.99] transition-transform duration-150"
        )}
        onClick={() => primaryImage?.public_url && onImageClick(primaryImage.public_url, primaryIndex)}
        role={primaryImage?.public_url ? "button" : undefined}
        tabIndex={primaryImage?.public_url ? 0 : undefined}
        aria-label={primaryImage?.public_url ? "View full screen" : undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            primaryImage?.public_url && onImageClick(primaryImage.public_url, primaryIndex)
          }
        }}
      >
        {primaryImage?.public_url ? (
          <ImageWithFallback
            src={primaryImage.public_url}
            alt={styleName || 'Style image'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Palette className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Horizontal Image Gallery Strip */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => image.public_url && onImageClick(image.public_url, index)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border shadow-sm transition-all active:scale-95",
                image.id === primaryImage?.id ? "border-orange-500 ring-2 ring-orange-500/10" : "border-border hover:border-orange-500/50"
              )}
            >
              {image.public_url ? (
                <ImageWithFallback
                  src={image.public_url}
                  alt={image.caption || 'Style image'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
              {image.is_primary && (
                <span className="absolute top-1 left-1 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-md font-medium">
                  Hero
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
