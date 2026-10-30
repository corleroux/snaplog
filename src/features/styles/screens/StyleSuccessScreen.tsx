/**
 * Style Success Screen Component
 *
 * Displays success state after style creation.
 *
 * DESIGN ALIGNED:
 * - Premium light surfaces with warm accent
 * - Clear visual hierarchy
 * - Modern rounded surfaces
 * - Mobile-first touch-friendly sizing
 * - Consistent with design system tokens
 */

import { type ReactNode } from 'react'
import { CheckCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui'

export interface StyleSuccessScreenProps {
  /** ID of the created style */
  styleId: string
  /** Optional style name for display */
  styleName?: string
  /** Callback when user wants to view the style */
  onViewStyle?: () => void
  /** Callback when user wants to add another style */
  onAddAnother?: () => void
  /** Optional additional content */
  children?: ReactNode
  /** Additional className */
  className?: string
}

/**
 * Success screen component for style creation
 *
 * Shows:
 * - Success icon and message
 * - Created style ID
 * - Option to view the style
 * - Option to add another style
 */
export function StyleSuccessScreen({
  styleId,
  styleName,
  onViewStyle,
  onAddAnother,
  children,
  className,
}: StyleSuccessScreenProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px] px-6 py-8 text-center',
      className
    )}>
      {/* Success icon with animation */}
      <div className="mb-6 relative">
        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
          <CheckCircle className="h-14 w-14 text-green-600 dark:text-green-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Success message */}
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Style Saved!
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {styleName
          ? `${styleName} has been successfully added to your catalogue.`
          : 'The style has been successfully added to your catalogue.'}
      </p>

      {/* Style ID badge */}
      <div className="mb-8 px-4 py-2 bg-muted rounded-lg border border-border">
        <span className="text-sm text-muted-foreground">
          Style ID: <span className="font-mono font-medium text-foreground">{styleId}</span>
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        {onViewStyle && (
          <Button
            variant="default"
            onClick={onViewStyle}
            type="button"
            className="flex-1"
          >
            View Style
          </Button>
        )}
        {onAddAnother && (
          <Button
            variant="outline"
            onClick={onAddAnother}
            type="button"
            className="flex-1"
          >
            Add Another Style
          </Button>
        )}
      </div>

      {/* Additional content */}
      {children}
    </div>
  )
}
