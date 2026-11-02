/**
 * Extraction Panel
 *
 * Read-only panel showing original AI extraction metadata.
 * Displayed only when a style was created via extraction.
 */

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SectionContainer } from '@/components/ui/section-container'

export interface ExtractionPanelProps {
  extractedAt: string
  extractionWarnings?: unknown
}

/**
 * Format date for display
 */
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

/**
 * Helper to safely render warnings
 */
function renderWarnings(warnings: unknown) {
  if (Array.isArray(warnings)) {
    return warnings.map((warning: unknown, idx: number) => (
      <p key={idx} className="text-xs text-danger dark:text-danger">
        • {typeof warning === 'string' ? warning : JSON.stringify(warning)}
      </p>
    ))
  }
  return null
}

export function ExtractionPanel({ extractedAt, extractionWarnings }: ExtractionPanelProps) {
  const hasWarnings = Array.isArray(extractionWarnings) && extractionWarnings.length > 0

  return (
    <SectionContainer
      title="Original Extraction"
      description="This data was extracted when the style was created and cannot be modified."
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
    >
      {/* Extraction metadata */}
      <div className="flex items-center gap-4 text-sm mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Extracted:</span>
          <span className="font-medium text-foreground">{formatDate(extractedAt)}</span>
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
            {renderWarnings(extractionWarnings)}
          </div>
        </div>
      )}

      {/* Important notice */}
      <div className="pt-3 mt-2 border-t border-danger/50 dark:border-danger/50">
        <div className="flex items-start gap-2 text-xs text-danger">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold">Note:</span> AI extraction is only available when creating a new style.
            Editing is manual only and will not reprocess images.
          </p>
        </div>
      </div>
    </SectionContainer>
  )
}
