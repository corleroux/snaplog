import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils/cn'
import { Label } from './label'

const inputVariants = cva(
  'flex w-full rounded-md border bg-background px-3 py-2 ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'h-9 px-3 py-1 text-sm',
        md: 'h-10 px-3 py-2 text-base',
        lg: 'h-11 px-4 py-2.5 text-lg',
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

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'state'>,
    VariantProps<typeof inputVariants> {
  label?: string
  helperText?: string
  errorText?: string
  containerClassName?: string
  id?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
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
    // Generate unique ID for label-input association
    const generatedId = React.useId()
    const id = propId || generatedId

    // Auto-set error state if errorText is provided
    const inputState = errorText ? 'error' : state

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
        <input
          type={type}
          id={id}
          className={cn(inputVariants({ size, state: inputState }), className)}
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
Input.displayName = 'Input'

export { Input, inputVariants }
