/**
 * Form field wrapper for consistent styling
 *
 * Shared across all edit section components.
 */

import { AlertTriangle } from 'lucide-react'

export interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}

export function FormField({
  label,
  required,
  error,
  hint,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={label.toLowerCase().replace(/\s+/g, '_')} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <div className="flex items-center gap-1 text-sm text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
