/**
 * Image Lightbox Component
 *
 * Full-screen image viewer with backdrop and close functionality.
 * Supports single image (backward compatible) and multi-image gallery with navigation.
 *
 * DESIGN ALIGNED:
 * - Full-screen overlay with backdrop blur
 * - Close button (X) in top-right
 * - Image with object-contain for full visibility
 * - Click-outside-to-close functionality
 * - Escape key to close
 * - Arrow key navigation for multi-image
 * - Touch swipe support
 * - Smooth fade-in/out animations
 * - Proper z-index (z-modal: 60)
 * - Mobile-first touch-friendly sizing
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface ImageLightboxProps {
  /** Image source URL (single image mode) */
  src: string | null
  /** Alt text for accessibility */
  alt: string
  /** Whether the lightbox is open */
  isOpen: boolean
  /** Callback to close the lightbox */
  onClose: () => void
  /** Array of image URLs for gallery mode */
  images?: string[]
  /** Initial index to display (gallery mode) */
  initialIndex?: number
}

/**
 * Full-screen image lightbox component
 *
 * Shows:
 * - Full-screen overlay with dark backdrop
 * - Centered image with object-contain
 * - Close button in top-right corner
 * - Closes on click outside or Escape key
 * - Gallery navigation with prev/next buttons (when images prop provided)
 * - Touch swipe support
 * - Keyboard arrow navigation
 */
export function ImageLightbox({
  src,
  alt,
  isOpen,
  onClose,
  images,
  initialIndex,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0)
  const touchStartX = useRef<number>(0)

  // Reset currentIndex when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex ?? 0)
  }, [initialIndex])

  // Determine which image to display
  const displaySrc = images && images.length > 0 ? images[currentIndex] : src

  // Handle Escape key to close, Arrow keys for navigation
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && images && currentIndex > 0) {
        setCurrentIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'ArrowRight' && images && currentIndex < images.length - 1) {
        setCurrentIndex((i) => Math.min(images.length - 1, i + 1))
      }
    },
    [isOpen, onClose, images, currentIndex]
  )

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!images || images.length <= 1) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50 && currentIndex > 0) {
      setCurrentIndex((i) => Math.max(0, i - 1))
    } else if (delta < -50 && currentIndex < images.length - 1) {
      setCurrentIndex((i) => Math.min(images.length - 1, i + 1))
    }
  }

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEscape])

  if (!isOpen || !displaySrc) return null

  const hasGallery = images && images.length > 1
  const showPrev = hasGallery && currentIndex > 0
  const showNext = hasGallery && currentIndex < images.length - 1

  return (
    <div
      className="fixed inset-0 z-modal bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Full screen image viewer"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Close full screen view"
      >
        <X className="h-6 w-6 text-white" />
      </button>

      {/* Navigation: Previous */}
      {showPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setCurrentIndex((i) => Math.max(0, i - 1))
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Navigation: Next */}
      {showNext && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setCurrentIndex((i) => Math.min(images!.length - 1, i + 1))
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Next image"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Image container */}
      <div
        className="relative max-w-full max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={displaySrc}
          alt={alt}
          className="max-w-full max-h-[90vh] object-contain"
        />

        {/* Image counter */}
        {hasGallery && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  )
}
