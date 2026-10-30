/**
 * Review Components Index
 *
 * Exports all review-specific components for easy importing.
 *
 * Components:
 * - FieldWithConfidence: Enhanced form field with confidence indicator and modification tracking
 * - ConfidenceSummary: At-a-glance overview of confidence across all fields
 */

export { FieldWithConfidence, FieldWithConfidenceSimple } from './FieldWithConfidence'
export {
  ConfidenceSummary,
  ConfidenceSummaryCompact,
  getConfidenceLevel,
} from './ConfidenceSummary'

export type {
  ConfidenceLevel,
  ReviewFieldState,
  ReviewFormState,
  ConfidenceSummary as ConfidenceSummaryType,
  FieldModification,
  ConfidenceIndicatorProps,
  ConfidenceSummaryDisplayProps,
} from '@/types/review'
