/**
 * Style Processing Screen Component
 *
 * Displays the AI extraction processing state for style creation.
 *
 * IMAGE-FIRST DESIGN:
 * - Large hero image is the primary focus
 * - Subtle animated processing indicator
 * - Minimal text messaging
 * - Reinforces one-time extraction
 */

import { type ReactNode } from 'react'
import { Loader2, Sparkles, Eye } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'
import type { CaptureImage } from '@/types/capture'

export interface StyleProcessingScreenProps {
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
 * Processing screen component for style extraction
 *
 * IMAGE-FIRST APPROACH:
 * - Hero image takes up majority of screen space
 * - Subtle overlay for processing state
 * - Minimal text below image
 * - Clear one-time extraction messaging
 */
export function StyleProcessingScreen({
  infoImage,
  isProcessing,
  error,
  onRetry,
  onCancel,
  children,
  className,
}: StyleProcessingScreenProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center px-4 py-6 space-y-6',
      className
    )}>
      {/* Large hero image - primary focus */}
      <div className="relative w-full aspect-[4/3] max-w-sm rounded-2xl overflow-hidden shadow-2xl border-2 border-orange-500/20 bg-muted">
        {infoImage?.uri ? (
          <img
            src={infoImage.uri}
            alt="Style image being processed"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Eye className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}

        {/* Subtle processing indicator overlay */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <Sparkles className="h-8 w-8 text-white animate-spin-slow" />
              </div>
              <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
                <span className="text-sm text-white font-medium">
                  Extracting...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Minimal messaging below image */}
      <div className="text-center max-w-sm space-y-3">
        {/* Processing state - minimal text */}
        {isProcessing && (
          <>
            <p className="text-sm text-muted-foreground">
              Extracting style information...
            </p>
            <p className="text-xs text-muted-foreground/70">
              You'll review and edit before saving
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <Sparkles className="h-3 w-3 text-amber-600 dark:text-amber-500" />
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                Extraction happens once
              </span>
            </div>
          </>
        )}

        {/* Error state */}
        {!isProcessing && error && (
          <>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Extraction Failed
            </h2>
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
              {onRetry && (
                <Button
                  variant="accent"
                  onClick={onRetry}
                  type="button"
                  radius="pill"
                  size="sm"
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
                  size="sm"
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
        <div className="mt-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            type="button"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}
