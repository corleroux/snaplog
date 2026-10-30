/**
 * Form Field Component
 *
 * Consistent form field wrapper with label, error, and hint display.
 * Used across edit screens for unified styling.
 */

import { AlertTriangle } from 'lucide-react'

export interface FormFieldProps {
  /** Field label */
  label: string
  /** Whether field is required */
  required?: boolean
  /** Error message to display */
  error?: string
  /** Hint text to display (shown when no error) */
  hint?: string
  /** Field input/control */
  children: React.ReactNode
}

/**
 * Form field wrapper for consistent styling
 *
 * Generates a unique htmlFor ID from the label by lowercasing
 * and replacing spaces with underscores.
 */
export function FormField({
  label,
  required,
  error,
  hint,
  children,
}: FormFieldProps) {
  const htmlFor = label.toLowerCase().replace(/\s+/g, '_')

  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
