/**
 * Vendor Review Image Section Components
 *
 * Extracted from VendorReviewScreen for maintainability.
 * Contains the source image display for vendor review.
 */

import { SectionContainer } from '@/components/ui/section-container'
import type { CaptureImage } from '@/types/capture'

/**
 * Source image preview for the vendor extraction
 */
export function SourceImagePreview({
  infoImage,
}: {
  infoImage: CaptureImage
}) {
  return (
    <SectionContainer
      title="Source Image"
      description="This image was used for extraction"
    >
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 border-orange-500/30 bg-muted">
          <img
            src={infoImage.uri}
            alt="Source Info image"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground mb-1">Info Image</p>
          <p className="text-xs text-muted-foreground">
            This image was processed to extract the vendor details below.
            After saving, it will become part of the vendor's image gallery.
          </p>
        </div>
      </div>
    </SectionContainer>
  )
}
