/**
 * ErrorState Component
 *
 * Consistent error state presentation across the application.
 *
 * DESIGN PRINCIPLES:
 * - Clear visual feedback for errors
 * - Helpful messaging with actionable next steps
 * - Optional retry functionality
 * - Premium dark mobile-first aesthetic
 *
 * VARIANTS:
 * - 'default': Standard centered error state
 * - 'inline': Compact inline error state
 * - 'inline-banner': Horizontal banner error state
 */

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { AlertTriangle, XCircle, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from './button'

export interface ErrorStateProps {
  /** Visual variant */
  variant?: 'default' | 'inline' | 'inline-banner'
  /** Optional custom icon */
  icon?: ReactNode
  /** Error title */
  title?: string
  /** Error message */
  message: string
  /** Optional retry callback */
  onRetry?: () => void
  /** Optional additional className */
  className?: string
  /** Size of the error icon */
  size?: 'sm' | 'md' | 'lg'
  /** Optional action button text (defaults to 'Retry') */
  actionText?: string
  /** Optional custom action */
  customAction?: ReactNode
}

/**
 * Error state component for consistent error presentation
 *
 * @example
 * ```tsx
 * // Default usage
 * <ErrorState message="Failed to load data" onRetry={retry} />
 *
 * // With title
 * <ErrorState title="Not Found" message="The item you're looking for doesn't exist" />
 *
 * // Inline banner
 * <ErrorState variant="inline-banner" message="Connection error" onRetry={retry} />
 *
 * // With custom action
 * <ErrorState message="Failed to load" customAction={<Link to="/">Go Home</Link>} />
 * ```
 */
export function ErrorState({
  variant = 'default',
  icon,
  title,
  message,
  onRetry,
  className,
  size = 'md',
  actionText,
  customAction,
}: ErrorStateProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  const containerSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-3 text-destructive', className)}>
        {icon || <AlertTriangle className={cn('flex-shrink-0', sizeClasses[size])} />}
        <div className="flex-1 min-w-0">
          {title && <p className="text-sm font-medium">{title}</p>}
          <p className="text-sm text-muted-foreground truncate">{message}</p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="flex-shrink-0"
          >
            {actionText || 'Retry'}
          </Button>
        )}
      </div>
    )
  }

  if (variant === 'inline-banner') {
    return (
      <div className={cn(
        'rounded-lg bg-destructive/10 border border-destructive/20 p-4',
        className
      )}>
        <div className="flex items-start gap-3">
          {icon || <AlertTriangle className={cn('flex-shrink-0 mt-0.5', sizeClasses.sm)} />}
          <div className="flex-1 min-w-0">
            {title && <p className="text-sm font-medium text-destructive mb-1">{title}</p>}
            <p className="text-sm text-destructive/80">{message}</p>
          </div>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="flex-shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[50vh] px-4', className)}>
      {/* Icon */}
      <div className={cn('rounded-full bg-muted flex items-center justify-center mb-4', containerSizeClasses[size])}>
        {icon || <AlertTriangle className={cn(sizeClasses[size], 'text-destructive')} />}
      </div>

      {/* Title */}
      {title && (
        <h3 className="text-lg font-semibold text-foreground mb-2 text-center">
          {title}
        </h3>
      )}

      {/* Message */}
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
        {message}
      </p>

      {/* Actions */}
      {customAction || (onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          radius="pill"
        >
          {actionText || 'Retry'}
        </Button>
      ))}
    </div>
  )
}

/**
 * Pre-configured error states for common scenarios
 */
export function NotFoundErrorState(props: Omit<ErrorStateProps, 'title' | 'icon'>) {
  const { message, ...rest } = props
  return (
    <ErrorState
      icon={<XCircle className="h-8 w-8 text-destructive" />}
      title="Not Found"
      message={message || 'The item you\'re looking for doesn\'t exist or may have been removed.'}
      {...rest}
    />
  )
}

export function NetworkErrorState(props: Omit<ErrorStateProps, 'title' | 'icon'>) {
  const { message, onRetry, ...rest } = props
  return (
    <ErrorState
      icon={<WifiOff className="h-8 w-8 text-destructive" />}
      title="Connection Error"
      message={message || 'Unable to connect. Please check your internet connection and try again.'}
      onRetry={onRetry}
      {...rest}
    />
  )
}

export function LoadingErrorState(props: Omit<ErrorStateProps, 'title' | 'icon'>) {
  const { message, onRetry, ...rest } = props
  return (
    <ErrorState
      icon={<AlertTriangle className="h-8 w-8 text-destructive" />}
      title="Failed to Load"
      message={message || 'Something went wrong while loading the data. Please try again.'}
      onRetry={onRetry}
      {...rest}
    />
  )
}
