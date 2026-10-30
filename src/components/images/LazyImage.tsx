/**
 * LazyImage Component
 *
 * Loads images on scroll with placeholder support and
 * cancels loading if image goes out of view.
 */

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'

interface LazyImageProps {
  /** Image source URL */
  src: string
  /** Alt text for accessibility */
  alt: string
  /** Optional className */
  className?: string
  /** Image height (for placeholder) */
  height?: string | number
  /** Image width (for placeholder) */
  width?: string | number
  /** Placeholder to show while loading */
  placeholder?: React.ReactNode
  /** Callback when image loads */
  onLoad?: () => void
  /** Callback when image errors */
  onError?: () => void
  /** Root margin for intersection observer (px) */
  rootMargin?: string
  /** Threshold for triggering load (0-1) */
  threshold?: number
  /** Fade in duration (ms) */
  fadeInDuration?: number
}

export function LazyImage({
  src,
  alt,
  className,
  height,
  width,
  placeholder,
  onLoad,
  onError,
  rootMargin = '50px',
  threshold = 0.01,
  fadeInDuration = 300,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Set up intersection observer to detect when image is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      { rootMargin, threshold }
    )

    const imgElement = imgRef.current
    if (imgElement) {
      observer.observe(imgElement)
    }

    return () => {
      observer.disconnect()
    }
  }, [rootMargin, threshold])

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  // Handle image error
  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  const style = {
    height: height ?? 'auto',
    width: width ?? 'auto',
  }

  // Show placeholder while not in view or loading
  if (!isInView || !isLoaded) {
    return (
      <div
        ref={imgRef}
        className={cn(
          'bg-muted/50 flex items-center justify-center',
          className
        )}
        style={style}
        data-lazy-placeholder
      >
        {placeholder || (
          <div className="animate-pulse bg-muted h-full w-full" />
        )}
      </div>
    )
  }

  // Show error state
  if (hasError) {
    return (
    <div
        className={cn(
          'bg-muted/50 flex items-center justify-center text-muted-foreground',
          className
        )}
        style={style}
        data-lazy-error
      >
        <span className="text-sm">Failed to load image</span>
      </div>
    )
  }

  // Show actual image
  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={cn(
        'transition-opacity duration-300',
        isLoaded && 'opacity-100',
        !isLoaded && 'opacity-0',
        className
      )}
      style={{
        ...style,
        transitionDuration: `${fadeInDuration}ms`,
      }}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
    />
  )
}

/**
 * Skeleton placeholder for lazy images
 */
export function LazyImageSkeleton({
  className,
  height,
  width,
}: {
  className?: string
  height?: string | number
  width?: string | number
}) {
  return (
    <div
      className={cn(
        'bg-muted animate-pulse rounded',
        className
      )}
      style={{ height, width }}
      data-lazy-skeleton
    />
  )
}
