/**
 * Extraction Info Panel Component
 *
 * Displays read-only extraction metadata for vendors and styles.
 * Shows source image, extraction date, and any warnings.
 */

import { AlertTriangle, Check } from 'lucide-react'
import { SectionContainer } from '@/components/ui/section-container'
import { Badge } from '@/components/ui/badge'

interface ExtractionMeta {
  extractedAt: string
  warnings?: string[]
  confidence?: Record<string, number>
}

interface VendorImage {
  id: string
  uri: string
}

export interface ExtractionInfoPanelProps {
  /** Extraction metadata to display */
  extractionMeta: ExtractionMeta
  /** Source image used for extraction */
  sourceImage?: VendorImage
  /** Optional additional className */
  className?: string
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ExtractionInfoPanel({
  extractionMeta,
  sourceImage,
  className,
}: ExtractionInfoPanelProps) {
  const hasWarnings = extractionMeta.warnings && extractionMeta.warnings.length > 0

  return (
    <SectionContainer
      title="Original Extraction"
      description="This data was extracted when the vendor was created and cannot be modified."
      background="muted"
      rightAction={
        <Badge variant="outline" className="border-danger text-danger dark:border-primary/60 dark:text-danger text-xs">
          Read-only
        </Badge>
      }
      icon={
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-field-warn dark:bg-primary/20">
          <AlertTriangle className="h-4 w-4 text-danger dark:text-danger" />
        </div>
      }
      className={className}
    >
      {/* Source image preview if available */}
      {sourceImage && (
        <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-black/20 rounded-lg border border-danger/40 dark:border-danger/40 mb-4">
          <div className="relative flex-shrink-0">
            <img
              src={sourceImage.uri}
              alt="Source extraction image"
              className="w-20 h-20 object-cover rounded-md border border-danger/60 dark:border-danger/60"
            />
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary dark:bg-primary">
              <Check className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Source Image</p>
            <p className="text-xs text-muted-foreground">
              Used for AI extraction when this vendor was created
            </p>
          </div>
        </div>
      )}

      {/* Extraction metadata */}
      <div className="flex items-center gap-4 text-sm mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Extracted:</span>
          <span className="font-medium text-foreground">{formatDate(extractionMeta.extractedAt)}</span>
        </div>
      </div>

      {/* Extraction warnings if any */}
      {hasWarnings && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs font-medium text-danger dark:text-danger">
            <AlertTriangle className="h-4 w-4" />
            Extraction Warnings
          </div>
          <div className="space-y-1 pl-6">
            {extractionMeta.warnings!.map((warning, idx) => (
              <p key={idx} className="text-xs text-danger dark:text-danger">
                • {warning}
              </p>
            ))}
          </div>
        </div>
      )}

    </SectionContainer>
  )
}
