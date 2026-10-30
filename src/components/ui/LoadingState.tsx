/**
 * LoadingState Component
 *
 * Consistent loading state presentation across the application.
 *
 * DESIGN PRINCIPLES:
 * - Visual consistency across all screens
 * - Clear indication that content is being loaded
 * - Premium dark mobile-first aesthetic
 * - Optional custom messages and icons
 *
 * VARIANTS:
 * - 'default': Standard centered loading state
 * - 'inline': Compact inline loading state
 * - 'overlay': Full-screen overlay loading state
 */

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Loader2, Package, Building2, Search } from 'lucide-react'

export interface LoadingStateProps {
  /** Visual variant */
  variant?: 'default' | 'inline' | 'overlay'
  /** Optional custom icon */
  icon?: ReactNode
  /** Loading message */
  message?: string
  /** Optional additional className */
  className?: string
  /** Size of the loading icon */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Loading state component for consistent loading indicators
 *
 * @example
 * ```tsx
 * // Default usage
 * <LoadingState message="Loading vendors..." />
 *
 * // With custom icon
 * <LoadingState icon={<Package className="h-8 w-8" />} message="Loading styles..." />
 *
 * // Inline variant
 * <LoadingState variant="inline" message="Fetching data..." size="sm" />
 * ```
 */
export function LoadingState({
  variant = 'default',
  icon,
  message = 'Loading...',
  className,
  size = 'md',
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  const containerSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <Loader2 className={cn('animate-spin', sizeClasses[size])} />
        {message && <span className="text-sm">{message}</span>}
      </div>
    )
  }

  if (variant === 'overlay') {
    return (
      <div className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}>
        <div className="flex flex-col items-center gap-4">
          <div className={cn('rounded-full bg-muted flex items-center justify-center', containerSizeClasses[size])}>
            {icon || <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />}
          </div>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[50vh] px-4', className)}>
      <div className={cn('rounded-full bg-muted flex items-center justify-center mb-4', containerSizeClasses[size])}>
        {icon || <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />}
      </div>
      {message && (
        <p className="text-sm text-muted-foreground text-center">{message}</p>
      )}
    </div>
  )
}

/**
 * Pre-configured loading states for common contexts
 */
export function VendorLoadingState(props: Omit<LoadingStateProps, 'icon'>) {
  return (
    <LoadingState
      icon={<Building2 className="h-8 w-8 text-muted-foreground" />}
      message={props.message || 'Loading vendor data...'}
      {...props}
    />
  )
}

export function StyleLoadingState(props: Omit<LoadingStateProps, 'icon'>) {
  return (
    <LoadingState
      icon={<Package className="h-8 w-8 text-muted-foreground" />}
      message={props.message || 'Loading style data...'}
      {...props}
    />
  )
}

export function SearchLoadingState(props: Omit<LoadingStateProps, 'icon'>) {
  return (
    <LoadingState
      icon={<Search className="h-8 w-8 text-muted-foreground" />}
      message={props.message || 'Searching...'}
      {...props}
    />
  )
}
