import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  className?: string
  placement?: 'center' | 'top'
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-3xl',
  full: 'max-w-full mx-4',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showClose = true,
  className,
  placement = 'center',
}: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      // Z-index: overlay layer (z-50)
      className={cn(
        'z-overlay fixed inset-0 flex justify-center bg-background/80 backdrop-blur-sm animate-in fade-in',
        placement === 'top'
          ? 'items-start px-4 pt-6 safe-area-top sm:pt-10'
          : 'items-end sm:items-center'
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full bg-background shadow-lg sm:rounded-lg',
          'max-h-[90vh] sm:max-h-[85vh] overflow-hidden',
          'flex flex-col',
          'animate-in slide-in-from-bottom sm:slide-in-from-bottom-4',
          'duration-200',
          // Z-index: modal layer (z-60) - ensures modal is above overlay
          'z-modal relative',
          // Safe area inset for bottom home indicator
          'safe-area-bottom',
          placement === 'top' && [
            'mt-3 sm:mt-0',
            'pt-2',
            'rounded-[1rem] border border-border/80 bg-background/95',
            'shadow-[0_16px_44px_-28px_rgba(15,23,42,0.28),0_6px_18px_-14px_rgba(249,115,22,0.18)]',
          ],
          sizeStyles[size],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description || showClose) && (
          <div
            className={cn(
              'flex items-start justify-between gap-4 border-b border-border shrink-0 safe-area-top',
              placement === 'top' ? 'px-5 pb-4 pt-5' : 'p-4'
            )}
          >
            <div className="flex-1">
              {title && (
                <h2 className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
            {showClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn('flex-1 overflow-y-auto', placement === 'top' ? 'px-5 pb-5 pt-4' : 'p-4')}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={cn('border-t border-border shrink-0', placement === 'top' ? 'px-5 pb-5 pt-4' : 'p-4')}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
