/**
 * Review domain type definitions
 *
 * Types for review screens, confidence handling, and form state management.
 */

/**
 * Confidence level for AI-extracted data
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * State of a single field in the review form
 */
export interface ReviewFieldState<T = string> {
  /** Current value in the form */
  currentValue: T
  /** Original extracted value */
  extractedValue: T
  /** Whether the field has been modified by the user */
  isModified: boolean
  /** AI confidence level for the extracted value */
  confidence: ConfidenceLevel
  /** Validation error message, if any */
  error?: string
}

/**
 * Overall state of the review form
 */
export interface ReviewFormState<T extends Record<string, any> = Record<string, any>> {
  /** All field states keyed by field name */
  fields: T
  /** Whether the form has unsaved changes */
  isDirty: boolean
  /** Number of fields that have been modified */
  modifiedCount: number
  /** Number of fields with low confidence */
  lowConfidenceCount: number
  /** Whether the form is currently being saved */
  isSaving: boolean
}

/**
 * Summary of confidence across all fields
 */
export interface ConfidenceSummary {
  /** Number of fields with high confidence */
  high: number
  /** Number of fields with medium confidence */
  medium: number
  /** Number of fields with low confidence */
  low: number
  /** Total number of fields */
  total: number
}

/**
 * Field modification tracking
 */
export interface FieldModification {
  /** Field name */
  field: string
  /** Original value */
  originalValue: string
  /** Current value */
  currentValue: string
}

/**
 * Props for confidence-indicator components
 */
export interface ConfidenceIndicatorProps {
  /** Confidence level to display */
  level?: ConfidenceLevel
  /** Whether to show a compact version (smaller, no text) */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Props for the confidence summary component
 */
export interface ConfidenceSummaryDisplayProps {
  /** Confidence scores by field name */
  confidenceScores: Record<string, number>
  /** Optional callback when a field is clicked */
  onFieldClick?: (fieldId: string) => void
  /** Additional CSS classes */
  className?: string
}
