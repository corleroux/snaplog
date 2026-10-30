import * as React from "react"
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from "@/lib/utils/cn"
import { Label } from './label'

const textareaVariants = cva(
  'flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'min-h-[60px] px-3 py-2 text-sm',
        md: 'min-h-[80px] px-3 py-2 text-base',
        lg: 'min-h-[120px] px-4 py-3 text-lg',
      },
      state: {
        default: 'border-input',
        error: 'border-destructive focus-visible:ring-destructive',
        success: 'border-green-500 focus-visible:ring-green-500',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
    },
  }
)

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'state'>,
    VariantProps<typeof textareaVariants> {
  label?: string
  helperText?: string
  errorText?: string
  containerClassName?: string
  id?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      helperText,
      errorText,
      containerClassName,
      size,
      state,
      id: propId,
      ...props
    },
    ref
  ) => {
    // Generate unique ID for label-textarea association
    const generatedId = React.useId()
    const id = propId || generatedId

    // Auto-set error state if errorText is provided
    const textareaState = errorText ? 'error' : state

    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <Label
            htmlFor={id}
            className={cn(
              'text-sm font-medium leading-none',
              errorText && 'text-destructive'
            )}
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}
        <textarea
          id={id}
          className={cn(textareaVariants({ size, state: textareaState }), className)}
          ref={ref}
          aria-invalid={errorText ? 'true' : undefined}
          aria-describedby={
            errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined
          }
          {...props}
        />
        {helperText && !errorText && (
          <p id={`${id}-helper`} className="text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
        {errorText && (
          <p id={`${id}-error`} className="text-sm text-destructive">
            {errorText}
          </p>
        )}
      </div>
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
