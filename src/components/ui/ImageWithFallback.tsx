/**
 * Image with Fallback Component
 *
 * Displays an image with proper error handling and fallback UI.
 * Handles:
 * - Local file URIs (file://, capacitor://) that can't be displayed
 * - Failed image loads
 * - CORS issues
 * - Missing images
 *
 * DESIGN ALIGNED:
 * - Premium surfaces with warm accent
 * - Clear visual feedback
 * - Mobile-first touch-friendly sizing
 */

import { useState, useCallback } from 'react'
import { Image as ImageIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ImageWithFallbackProps {
  /** Image source URL or local URI */
  src: string
  /** Alt text for accessibility */
  alt: string
  /** Additional className */
  className?: string
  /** Fallback element to show on error */
  fallback?: React.ReactNode
  /** Whether to show a detailed error state */
  showError?: boolean
  /** Image width for placeholder sizing */
  width?: number
  /** Image height for placeholder sizing */
  height?: number
}

/**
 * Check if a URI is a local file URI that can't be displayed in browser img tags
 */
function isLocalFileUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('capacitor://') ||
    uri.startsWith('content://') ||
    uri.startsWith('blob:')
  )
}

/**
 * Image component with automatic fallback handling
 *
 * Shows:
 * - The image if it loads successfully
 * - A placeholder icon if the URI is a local file
 * - An error state if the image fails to load
 */
export function ImageWithFallback({
  src,
  alt,
  className,
  fallback,
  showError = false,
  width,
  height,
}: ImageWithFallbackProps) {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const isLocalUri = isLocalFileUri(src)

  const handleLoad = useCallback(() => {
    setImageState('loaded')
  }, [])

  const handleError = useCallback(() => {
    setImageState('error')
  }, [])

  // If it's a local URI, don't even try to load it
  if (isLocalUri) {
    return (
      <div
        className={cn(
          'bg-muted border border-border flex items-center justify-center',
          'text-muted-foreground/50',
          className
        )}
        style={{ width, height }}
      >
        {fallback || (
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <ImageIcon className="h-8 w-8" />
            <p className="text-xs">Local file</p>
          </div>
        )}
      </div>
    )
  }

  // Show error state
  if (imageState === 'error' || (showError && isLocalUri === false)) {
    return (
      <div
        className={cn(
          'bg-muted border border-border flex items-center justify-center',
          'text-muted-foreground/50',
          className
        )}
        style={{ width, height }}
      >
        {fallback || (
          <div className="flex flex-col items-center gap-2 text-center p-4">
            <AlertCircle className="h-8 w-8 text-destructive/50" />
            <p className="text-xs">Failed to load</p>
          </div>
        )}
      </div>
    )
  }

  // Normal image
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      style={{ width, height }}
      loading="lazy"
    />
  )
}
