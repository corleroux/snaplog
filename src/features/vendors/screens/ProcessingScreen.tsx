/**
 * Vendor Processing Screen Component
 *
 * Displays the AI extraction processing state for vendor creation.
 *
 * DESIGN ALIGNED:
 * - Premium dark surfaces with warm orange accent
 * - Clear visual hierarchy with progress indication
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { type ReactNode } from 'react'
import { Loader2, Sparkles, Eye } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'
import type { CaptureImage } from '@/types/capture'

export interface ProcessingScreenProps {
  /** The Info image being processed */
  infoImage: CaptureImage | null
  /** Whether processing is currently in progress */
  isProcessing: boolean
  /** Error message if processing failed */
  error?: string | null
  /** Callback for retry action */
  onRetry?: () => void
  /** Callback for cancel action */
  onCancel?: () => void
  /** Optional additional content */
  children?: ReactNode
  /** Additional className */
  className?: string
}

/**
 * Processing screen component for vendor extraction
 *
 * Shows:
 * - Preview of the Info image being processed
 * - Animated progress indicator during processing
 * - Clear messaging about one-time extraction
 * - Error state with retry option
 * - Cancel action
 */
export function ProcessingScreen({
  infoImage,
  isProcessing,
  error,
  onRetry,
  onCancel,
  children,
  className,
}: ProcessingScreenProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px] px-6 py-8',
      className
    )}>
      {/* Info image preview */}
      <div className="mb-8 relative">
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-orange-500/30 bg-muted">
          {infoImage?.uri ? (
            <img
              src={infoImage.uri}
              alt="Info image preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Eye className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Processing indicator overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl">
            <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/40 animate-pulse">
              <Sparkles className="h-10 w-10 text-white animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Status messaging */}
      <div className="text-center max-w-md space-y-4">
        {/* Processing state */}
        {isProcessing && (
          <>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
              <h2 className="text-xl font-semibold text-foreground">
                Extracting Information
              </h2>
            </div>
            <p className="text-muted-foreground">
              Analyzing your vendor image to extract company details...
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Sparkles className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                Extraction happens once during create flow
              </span>
            </div>
          </>
        )}

        {/* Error state */}
        {!isProcessing && error && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              Extraction Failed
            </h2>
            <p className="text-muted-foreground">
              {error}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              {onRetry && (
                <Button
                  variant="accent"
                  onClick={onRetry}
                  type="button"
                  radius="pill"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={onCancel}
                  type="button"
                  radius="pill"
                >
                  Go Back
                </Button>
              )}
            </div>
          </>
        )}

        {/* Additional content */}
        {children}
      </div>

      {/* Cancel button during processing */}
      {isProcessing && onCancel && (
        <div className="mt-8">
          <Button
            variant="ghost"
            onClick={onCancel}
            type="button"
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
