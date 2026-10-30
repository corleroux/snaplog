/**
 * EmptyState Component
 *
 * Consistent empty state presentation across the application.
 *
 * DESIGN PRINCIPLES:
 * - Visual consistency across all screens
 * - Clear messaging about why state is empty
 * - Actionable CTAs when appropriate
 * - Premium dark mobile-first aesthetic with fabric-native visual treatment
 *
 * VARIANTS:
 * - 'default': Standard centered empty state with illustration
 * - 'inline': Compact inline empty state
 * - 'card': Card-based empty state for lists/grids
 */

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Package, Building2, Search, Inbox } from 'lucide-react'
import { Button } from './button'
import { Link } from 'react-router-dom'

export interface EmptyStateProps {
  /** Visual variant */
  variant?: 'default' | 'inline' | 'card'
  /** Optional custom icon or illustration */
  icon?: ReactNode
  /** Empty state title */
  title: string
  /** Optional description */
  description?: string
  /** Optional primary action */
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'accent'
  }
  /** Optional link action */
  linkAction?: {
    label: string
    to: string
  }
  /** Optional additional className */
  className?: string
  /** Size of the icon */
  size?: 'sm' | 'md' | 'lg'
  /** Optional custom illustration (replaces icon) */
  illustration?: ReactNode
}

/**
 * Empty state component for consistent empty presentation
 *
 * @example
 * ```tsx
 * // Default usage
 * <EmptyState title="No vendors yet" description="Vendors will appear here after capture" />
 *
 * // With action
 * <EmptyState
 *   title="No styles yet"
 *   description="Start by capturing your first style"
 *   action={{ label: 'Add Style', onClick: handleAdd }}
 * />
 *
 * // With link action
 * <EmptyState
 *   title="No styles for this vendor"
 *   linkAction={{ label: 'View Vendors', to: '/vendors' }}
 * />
 *
 * // Inline variant
 * <EmptyState variant="inline" title="No results found" />
 * ```
 */
export function EmptyState({
  variant = 'default',
  icon,
  title,
  description,
  action,
  linkAction,
  className,
  size = 'md',
  illustration,
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 h-16',
  }

  const containerSizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-24 h-24',
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-3 text-center py-8', className)}>
        {icon || <Inbox className={cn('text-muted-foreground/50', sizeClasses[size])} />}
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center',
        className
      )}>
        {illustration || (
          <div className={cn('rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4', containerSizeClasses[size])}>
            {icon || <Inbox className={cn('text-muted-foreground/50', sizeClasses[size])} />}
          </div>
        )}
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || 'outline'}
            size="sm"
            radius="pill"
          >
            {action.label}
          </Button>
        )}
        {linkAction && (
          <Link to={linkAction.to}>
            <Button variant="outline" size="sm" radius="pill">
              {linkAction.label}
            </Button>
          </Link>
        )}
      </div>
    )
  }

  // Default variant with fabric-native visual treatment
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[50vh] text-center px-4', className)}>
      {/* Fabric-themed illustration */}
      {illustration || (
        <div className={cn(
          'rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-950/30 dark:to-orange-900/20 flex items-center justify-center mb-6 relative overflow-hidden',
          containerSizeClasses[size]
        )}>
          {/* Subtle fabric pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]">
            <svg className="w-full h-full" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <pattern id="empty-fabric-pattern" patternUnits="userSpaceOnUse" width="8" height="8">
                <circle cx="4" cy="4" r="1" fill="currentColor" className="text-orange-500" />
              </pattern>
              <rect width="100" height="100" fill="url(#empty-fabric-pattern)" />
            </svg>
          </div>
          {icon || <Package className={cn('text-orange-500 relative z-10', sizeClasses[size])} />}
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-6">
          {description}
        </p>
      )}

      {/* Actions */}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'accent'}
          radius="pill"
          className="gap-2"
        >
          {action.label}
        </Button>
      )}
      {linkAction && !action && (
        <Link to={linkAction.to}>
          <Button variant="accent" radius="pill" className="gap-2">
            {linkAction.label}
          </Button>
        </Link>
      )}
    </div>
  )
}

/**
 * Pre-configured empty states for common contexts
 */

export function VendorEmptyState(props: {
  eventId: string
  onAddVendor?: () => void
  className?: string
}) {
  return (
    <EmptyState
      icon={<Building2 className="h-12 w-12 text-orange-500 relative z-10" />}
      title="No vendors yet"
      description="Vendors will appear here after capture. Start by adding your first vendor."
      action={props.onAddVendor ? {
        label: 'Add Vendor',
        onClick: props.onAddVendor,
        variant: 'accent',
      } : undefined}
      className={props.className}
    />
  )
}

export function StyleEmptyState(props: {
  hasAnyStyles: boolean
  vendorId?: string
  onAddStyle?: () => void
  className?: string
}) {
  const { hasAnyStyles, vendorId, onAddStyle, className } = props

  // No styles at all for this vendor
  if (!hasAnyStyles) {
    return (
      <EmptyState
        icon={<Package className="h-12 w-12 text-orange-500 relative z-10" />}
        title="No styles yet"
        description="Styles will appear here after capture. Start by adding your first style."
        action={onAddStyle ? {
          label: 'Add First Style',
          onClick: onAddStyle,
          variant: 'accent',
        } : undefined}
        className={className}
      />
    )
  }

  // No styles for specific vendor (but styles exist elsewhere)
  return (
    <EmptyState
      icon={<Package className="h-12 w-12 text-orange-500 relative z-10" />}
      title="No styles for this vendor"
      description="This vendor doesn't have any styles yet. Capture your first style to get started."
      action={onAddStyle && vendorId ? {
        label: 'Add First Style',
        onClick: onAddStyle,
        variant: 'accent',
      } : undefined}
      className={className}
    />
  )
}

export function SearchEmptyState(props: {
  searchQuery: string
  className?: string
}) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12 text-orange-500 relative z-10" />}
      title="No results found"
      description={`No items match "${props.searchQuery}". Try adjusting your search terms.`}
      className={props.className}
    />
  )
}
