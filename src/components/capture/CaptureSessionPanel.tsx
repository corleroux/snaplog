/**
 * Capture Session Panel Component
 *
 * A wrapper component that displays the current capture session state
 * and provides controls for interacting with it.
 *
 * DESIGN ALIGNED:
 * - Premium dark surfaces with warm orange accent
 * - Clear visual hierarchy and spacing
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { type ReactNode, useState, useRef, useEffect } from 'react'
import { AlertCircle, Sparkles, Info, X, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Badge, Button } from '@/components/ui'
import { SectionContainer } from '@/components/ui'
import { ImageStrip } from './ImageStrip'
import type { CaptureSession, SessionValidation } from '@/types/capture'

export interface CaptureSessionPanelProps {
  /** The current capture session */
  session: CaptureSession | null
  /** Validation result (if validated) */
  validation?: SessionValidation
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
  /** Optional header content */
  headerContent?: ReactNode
  /** Optional footer content */
  footerContent?: ReactNode
  /** Additional className */
  className?: string
  /** Whether to show the Info/Gallery explanation banner */
  showExplanation?: boolean
  /** Callback when Info image is replaced (for toast notification) */
  onInfoReplaced?: () => void
}

/**
 * Capture session panel component
 *
 * Displays:
 * - Session info header with entity type and image counts
 * - Visual badges for Info/Gallery counts
 * - Image strip with all captured images
 * - Validation warnings/errors if present
 * - Optional header and footer content
 */
export function CaptureSessionPanel({
  session,
  validation,
  activeImageId,
  showAddButton = true,
  onImageClick,
  onImageRemove,
  onClassificationToggle,
  onAddMore,
  headerContent,
  footerContent,
  className,
  showExplanation = true,
  onInfoReplaced,
}: CaptureSessionPanelProps) {
  // State for dismissible explanation banner
  const [explanationDismissed, setExplanationDismissed] = useState(false)

  // Track previous Info image ID for replacement detection
  const prevInfoImageIdRef = useRef<string | null>(null)

  // Detect Info image replacement for feedback
  useEffect(() => {
    if (session && session.infoImageId !== null) {
      const prevInfoId = prevInfoImageIdRef.current
      // If there was a previous Info image and it's different, this is a replacement
      if (prevInfoId !== null && prevInfoId !== session.infoImageId) {
        onInfoReplaced?.()
      }
      prevInfoImageIdRef.current = session.infoImageId
    } else if (session && session.infoImageId === null) {
      prevInfoImageIdRef.current = null
    }
  }, [session, onInfoReplaced])

  // No active session state
  if (!session) {
    return (
      <div className={cn(
        'text-center py-12 px-4',
        'bg-muted/30 rounded-xl border border-dashed border-border',
        className
      )}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-foreground font-medium">No active capture session</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start a session to capture images
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Calculate image counts
  const counts = {
    total: session.images.length,
    info: session.infoImageId !== null ? 1 : 0,
    gallery: session.images.filter((img) => img.classification === 'gallery').length,
  }

  // Entity type display name
  const entityTypeName = session.entityType === 'vendor' ? 'Vendor' : 'Fabric Style'

  return (
    <div className={cn('space-y-4', className)}>
      {/* Session info header */}
      {headerContent || (
        <SectionContainer
          title={`Capturing ${entityTypeName}`}
          description="Add images and mark one as Info for AI extraction"
          background="muted"
        >
          {/* Status badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Total count badge */}
            <Badge variant="secondary" className="font-medium">
              {counts.total} image{counts.total !== 1 ? 's' : ''}
            </Badge>

            {/* Info badge - prominent with warm accent */}
            {counts.info > 0 && (
              <Badge variant="accent" className="gap-1 bg-orange-500 text-white font-medium">
                <Sparkles className="h-3 w-3" />
                1 Info
              </Badge>
            )}

            {/* Gallery badge */}
            {counts.gallery > 0 && (
              <Badge variant="outline" className="font-medium">
                {counts.gallery} Gallery
              </Badge>
            )}
          </div>

          {/* Helper text */}
          {counts.info === 0 && counts.total > 0 && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="h-4 w-4" />
              Mark an image as Info to enable AI extraction
            </p>
          )}
        </SectionContainer>
      )}

      {/* Info vs Gallery explanation banner (dismissible) */}
      {showExplanation && !explanationDismissed && session && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
          <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Understanding image types
            </p>
            <div className="text-sm text-blue-700 dark:text-blue-300 mt-1 space-y-1">
              <p className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                <strong>Info image:</strong> Used for AI extraction (max 1)
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-muted border border-border" />
                <strong>Gallery images:</strong> For browsing and reference
              </p>
            </div>
          </div>
          <button
            onClick={() => setExplanationDismissed(true)}
            className="flex-shrink-0 inline-flex items-center justify-center rounded-md p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
            type="button"
            aria-label="Dismiss explanation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Image strip section */}
      <SectionContainer
        title="Captured Images"
        description={counts.total === 0 ? undefined : undefined}
      >
        {session.images.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">No images captured yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add images to start your capture session
            </p>
            {showAddButton && onAddMore && (
              <Button
                variant="accent"
                onClick={onAddMore}
                type="button"
              >
                Add First Image
              </Button>
            )}
          </div>
        ) : (
          <ImageStrip
            images={session.images}
            infoImageId={session.infoImageId}
            activeImageId={activeImageId}
            showAddButton={showAddButton}
            onImageClick={onImageClick}
            onImageRemove={onImageRemove}
            onClassificationToggle={onClassificationToggle}
            onAddMore={onAddMore}
          />
        )}
      </SectionContainer>

      {/* Validation messages */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {/* Errors */}
          {validation.errors.map((error, index) => (
            <div
              key={`error-${index}`}
              className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
            >
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          ))}

          {/* Warnings */}
          {validation.warnings.map((warning, index) => (
            <div
              key={`warning-${index}`}
              className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 dark:bg-amber-500/5 dark:border-amber-500/10 rounded-xl"
            >
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Optional footer content */}
      {footerContent && (
        <div className="border-t border-border pt-4">
          {footerContent}
        </div>
      )}
    </div>
  )
}
