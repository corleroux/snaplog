import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'

const sectionVariants = cva(
  'w-full',
  {
    variants: {
      spacing: {
        none: '',
        sm: 'py-3',
        md: 'py-4',
        lg: 'py-6',
        xl: 'py-8',
      },
      background: {
        none: '',
        card: 'bg-card rounded-lg border border-border shadow-sm',
        muted: 'bg-muted/50 rounded-lg',
      },
    },
    defaultVariants: {
      spacing: 'md',
      background: 'none',
    },
  }
)

export interface SectionContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sectionVariants> {
  title?: string
  description?: string
  rightAction?: React.ReactNode
  icon?: React.ReactNode
}

export function SectionContainer({
  children,
  className,
  spacing,
  background,
  title,
  description,
  rightAction,
  icon,
  ...props
}: SectionContainerProps) {
  return (
    <section
      className={cn(sectionVariants({ spacing, background }), className)}
      {...props}
    >
      {(title || description || icon || rightAction) && (
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            {icon && (
              <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-semibold text-foreground">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {description}
                </p>
              )}
            </div>
          </div>
          {rightAction && (
            <div className="flex-shrink-0">{rightAction}</div>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
