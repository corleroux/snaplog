/**
 * Style Library - Repository-Backed Persistence
 */

// Repository-backed providers and hooks (PRIMARY)
export {
  StyleRepositoryProvider,
  useStyleRepository,
  useStylesForVendor,
  useStyle,
  styleRepository,
  type StyleRepositoryProviderProps,
} from '@/features/styles'

// Extraction services (app-facing Style terminology)
export {
  extractStyle,
  commitStyle,
  isStyleExtractionComplete,
  getStyleExtractionStatus,
  STYLE_EXTRACTION_SERVICE_INFO,
  type StyleExtractionInput,
  type StyleExtractionResult,
  type StyleCommitInput,
  type StyleCommitResult,
  type ExtractionError,
  type CommitError,
} from '@/features/styles'

export type { StyleRecordCreateInput } from '@/types/style'
