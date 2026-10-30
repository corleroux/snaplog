/**
 * FieldWithConfidence Component
 *
 * An enhanced form field component that displays AI confidence indicators
 * and tracks user modifications for review screens.
 *
 * Features:
 * - Confidence indicator badge (high/medium/low)
 * - Visual highlighting based on confidence level
 * - Modified field indicator
 * - Revert to original button
 * - Field-level error display
 * - Accessibility support
 */

import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Input, Textarea } from '@/components/ui'
import type { ConfidenceLevel } from '@/types/review'
import { ConfidenceIndicator } from './ConfidenceIndicator'
import { ModifiedIndicator } from './ModifiedIndicator'

export interface FieldWithConfidenceProps {
  /** Field label */
  label: string
  /** Current value in the form */
  value: string
  /** Original extracted value */
  extractedValue: string
  /** AI confidence level */
  confidence?: ConfidenceLevel
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Callback when reverting to original value */
  onRevert?: () => void
  /** Optional icon component for the label */
  icon?: React.ComponentType<{ className?: string }>
  /** Whether the field is required */
  required?: boolean
  /** Input type (text, email, tel, url) */
  type?: 'text' | 'email' | 'tel' | 'url'
  /** Whether this is a multiline textarea */
  multiline?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Validation error message */
  error?: string
  /** Field ID for accessibility */
  id?: string
  /** Additional CSS classes */
  className?: string
}

/**
 * Enhanced field with confidence and modification tracking
 */
export function FieldWithConfidence({
  label,
  value,
  extractedValue,
  confidence,
  onChange,
  onRevert,
  icon: Icon,
  required = false,
  type = 'text',
  multiline = false,
  placeholder,
  error,
  id,
  className,
}: FieldWithConfidenceProps) {
  const [isFocused, setIsFocused] = useState(false)

  // Determine if field is modified
  const isModified = value !== extractedValue

  // Generate unique ID if not provided
  const fieldId = id || `field-${label.toLowerCase().replace(/\s+/g, '-')}`

  // Confidence-based border styling
  const getBorderClass = () => {
    if (error) return 'border-destructive focus:border-destructive'
    if (isFocused) return 'border-primary focus:border-primary'

    // Apply confidence-based borders
    switch (confidence) {
      case 'low':
        return 'border-amber-500 focus:border-amber-500'
      case 'high':
        return 'border-green-500/30 focus:border-green-500'
      default:
        return 'border-input focus:border-primary'
    }
  }

  // Confidence-based background styling (subtle)
  const getBackgroundClass = () => {
    if (confidence === 'low' && !isFocused && !isModified) {
      return 'bg-amber-50/50 dark:bg-amber-950/10'
    }
    return 'bg-background'
  }

  const InputComponent = multiline ? Textarea : Input

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }, [onChange])

  return (
    <div className={cn('space-y-1.5', className)}>
      {/* Label row with confidence, modified indicator, and revert */}
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-foreground flex items-center gap-2 flex-1 min-w-0"
        >
          {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span className="truncate">{label}</span>
          {required && <span className="text-destructive flex-shrink-0">*</span>}
        </label>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Confidence indicator */}
          <ConfidenceIndicator level={confidence} compact={isModified} />

          {/* Modified indicator with revert */}
          {isModified && onRevert && (
            <ModifiedIndicator
              onRevert={onRevert}
              isDisabled={value === extractedValue}
            />
          )}
        </div>
      </div>

      {/* Input field */}
      <InputComponent
        id={fieldId}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        type={type}
        rows={multiline ? 3 : undefined}
        className={cn(
          'transition-all duration-200',
          getBorderClass(),
          getBackgroundClass(),
          // Add visual emphasis for low confidence
          confidence === 'low' && !isFocused && 'shadow-sm'
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      />

      {/* Validation error */}
      {error && (
        <p
          id={`${fieldId}-error`}
          className="text-sm text-destructive flex items-start gap-1"
          role="alert"
        >
          <X className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {/* Helper text for low confidence fields */}
      {confidence === 'low' && !error && !isModified && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Low confidence — please verify this value
        </p>
      )}
    </div>
  )
}

/**
 * Simpler version for fields without modification tracking
 */
export interface FieldWithConfidenceSimpleProps {
  label: string
  value: string
  confidence?: ConfidenceLevel
  onChange: (value: string) => void
  icon?: React.ComponentType<{ className?: string }>
  required?: boolean
  type?: 'text' | 'email' | 'tel' | 'url'
  multiline?: boolean
  placeholder?: string
  error?: string
  id?: string
  className?: string
}

export function FieldWithConfidenceSimple({
  label,
  value,
  confidence,
  onChange,
  icon: Icon,
  required,
  type = 'text',
  multiline,
  placeholder,
  error,
  id,
  className,
}: FieldWithConfidenceSimpleProps) {
  // Use the enhanced component without modification tracking
  return (
    <FieldWithConfidence
      label={label}
      value={value}
      extractedValue={value}
      confidence={confidence}
      onChange={onChange}
      icon={Icon}
      required={required}
      type={type}
      multiline={multiline}
      placeholder={placeholder}
      error={error}
      id={id}
      className={className}
    />
  )
}
