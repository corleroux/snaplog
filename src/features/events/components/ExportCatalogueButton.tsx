/**
 * Export Catalogue Button Component
 *
 * Button component for generating PDF catalogues.
 */

import { Button } from '@/components/ui/button'
import { Loader2, FileText, Download } from 'lucide-react'
import { usePdfExport } from '@/features/events/hooks/usePdfExport'
import type { CatalogueOptions } from '@/lib/pdf/catalogueGenerator'

interface ExportCatalogueButtonProps {
  eventId: string
  options?: CatalogueOptions
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

/**
 * Button to export an event as a PDF catalogue
 */
export function ExportCatalogueButton({
  eventId,
  options = {},
  variant = 'default',
  size = 'default',
  className = '',
}: ExportCatalogueButtonProps) {
  const { isGenerating, generateCatalogue, error, clearError } = usePdfExport()

  const handleClick = async () => {
    clearError()
    try {
      await generateCatalogue(eventId, options)
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isGenerating}
        className={className}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            Export Catalogue
          </>
        )}
      </Button>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

/**
 * Extended export button with preview information
 */
interface ExportCatalogueButtonWithPreviewProps extends ExportCatalogueButtonProps {
  showPreview?: boolean
}

export function ExportCatalogueButtonWithPreview({
  eventId,
  options = {},
  variant = 'default',
  size = 'default',
  className = '',
  showPreview = true,
}: ExportCatalogueButtonWithPreviewProps) {
  const { isGenerating, isLoadingPreview, preview, generateCatalogue, loadPreview, error, clearError } = usePdfExport()

  const handleMouseEnter = () => {
    if (showPreview && !preview && !isLoadingPreview) {
      loadPreview(eventId).catch(() => {
        // Preview loading is optional
      })
    }
  }

  const handleClick = async () => {
    clearError()
    try {
      await generateCatalogue(eventId, options)
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          disabled={isGenerating}
          onMouseEnter={handleMouseEnter}
          className={className}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Export Catalogue
            </>
          )}
        </Button>
      </div>

      {preview && !isGenerating && (
        <div className="text-xs text-muted-foreground">
          {preview.vendorCount} vendors • {preview.styleCount} styles • {preview.imageCount} images
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
