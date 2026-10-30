/**
 * Swipe Actions Component
 *
 * Provides swipe-to-action functionality for mobile list items.
 * Supports swipe left to delete/archive and swipe right to edit.
 */

import { useRef, useState, useEffect } from 'react'
import { Trash2, Edit, Archive, X } from 'lucide-react'

export interface SwipeActionsProps {
  children: React.ReactNode
  onEdit?: () => void
  onDelete?: () => void
  onArchive?: () => void
  disabled?: boolean
  className?: string
}

export function SwipeActions({
  children,
  onEdit,
  onDelete,
  onArchive,
  disabled = false,
  className = '',
}: SwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [translateX, setTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentAction, setCurrentAction] = useState<'edit' | 'delete' | 'archive' | null>(null)

  const actionThreshold = 80 // px to trigger action
  const snapThreshold = 40 // px to snap to action preview
  const maxSwipe = 120 // px maximum swipe distance

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    setStartX(clientX)
    setIsDragging(true)
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || disabled) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const deltaX = clientX - startX

    // Clamp the translation
    const clampedDelta = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX))
    setTranslateX(clampedDelta)

    // Determine which action is being triggered
    if (clampedDelta > snapThreshold) {
      setCurrentAction('edit')
    } else if (clampedDelta < -snapThreshold) {
      setCurrentAction(onArchive ? 'archive' : 'delete')
    } else {
      setCurrentAction(null)
    }
  }

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging || disabled) return

    setIsDragging(false)

    // Check if action should be triggered
    if (translateX > actionThreshold && onEdit) {
      onEdit()
    } else if (translateX < -actionThreshold) {
      if (onArchive) {
        onArchive()
      } else if (onDelete) {
        onDelete()
      }
    }

    // Reset position
    setTranslateX(0)
    setCurrentAction(null)
  }

  // Cancel drag on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDragging) {
        setIsDragging(false)
        setTranslateX(0)
        setCurrentAction(null)
      }
    }

    if (isDragging) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDragging])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ touchAction: isDragging ? 'none' : 'pan-y' }}
    >
      {/* Action backgrounds */}
      <div
        className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none"
        style={{ transform: `translateX(${translateX}px)` }}
      >
        {/* Left action (Edit) - revealed on swipe right */}
        {onEdit && (
          <div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
              ${currentAction === 'edit' ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}
            `}
            style={{
              opacity: Math.max(0, translateX / snapThreshold),
              transform: `translateX(${Math.max(0, translateX - snapThreshold)}px)`,
            }}
          >
            <Edit className="h-5 w-5" />
            <span className="font-medium">Edit</span>
          </div>
        )}

        {/* Right action (Delete/Archive) - revealed on swipe left */}
        {(onDelete || onArchive) && (
          <div
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
              ${currentAction === 'delete' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'}
              ${currentAction === 'archive' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'}
            `}
            style={{
              opacity: Math.max(0, -translateX / snapThreshold),
              transform: `translateX(${Math.min(0, translateX + snapThreshold)}px)`,
            }}
          >
            <span className="font-medium">
              {onArchive ? (currentAction === 'archive' ? 'Archive' : 'Archive') : 'Delete'}
            </span>
            {onArchive ? <Archive className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className="relative bg-background transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${translateX}px)`,
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={handleTouchMove}
        onMouseUp={handleTouchEnd}
        onMouseLeave={isDragging ? handleTouchEnd : undefined}
      >
        {children}
      </div>

      {/* Drag indicator (shown during drag) */}
      {isDragging && translateX !== 0 && (
        <div className="absolute top-1/2 right-2 -translate-y-1/2 pointer-events-none">
          <X className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

/**
 * Swipe action trigger types
 */
export type SwipeActionType = 'edit' | 'delete' | 'archive'
