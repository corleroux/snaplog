/**
 * Style Feature Module
 *
 * Canonical style screens and style-specific UI live inside this feature.
 * Shared primitives remain in `src/components`.
 */

export * from './screens'
export * from './components'

// ACTIVE: API functions - used by persistence layer
export { getStyles } from './api/getStyles'
export { getStyleDetail } from './api/getStyleDetail'
export { updateStyle } from './api/updateStyle'
export { updateVariant } from './api/updateVariant'
export { commitReviewedFabric, isFabricAlreadyCommitted, getCommittedStyleId } from './api/commitReviewedFabricDocument'
export { extractFabricDocument } from './api/extractFabricDocument'
export {
  batchArchiveStyles,
  batchUpdateStyleSeason,
  batchUpdateStyleStatus,
  batchExportStyles,
} from './api/batchUpdateStyles'

// ACTIVE: TanStack Query hooks - additive cache layer
export {
  useStylesQuery,
  useStylesByEventQuery,
  useStyleQuery,
  useInvalidateStyles,
  useInvalidateStyle,
  styleKeys,
} from './hooks/useStyleQueries'
export { useStyles } from './hooks/useStyles'
export { useStyleDetail } from './hooks/useStyleDetail'
export { useStyleCaptureFlow } from './hooks/useStyleCaptureFlow'
export type { UseStyleCaptureFlowReturn, UseStyleCaptureFlowOptions } from './hooks/useStyleCaptureFlow'

// ACTIVE: Repository exports - used by persistence layer
export { styleRepository, createSupabaseStyleRepository, type StyleRepository } from './api/styleRepository'
export { type StyleCreateInput, type StyleUpdateInput, fabricStyleRowToStyleRecord, fabricImageToStyleImage, styleRecordToFabricStyleRow } from './api/styleMappers'
export {
  StyleRepositoryProvider,
  useStyleRepository,
  useStylesForVendor,
  useStyle,
  type StyleRepositoryProviderProps,
} from './api/styleRepositoryContext'

// ACTIVE: Extraction service - app-facing Style terminology
export {
  extractStyle,
  commitStyle,
  isStyleExtractionComplete,
  getStyleExtractionStatus,
  type StyleExtractionInput,
  type StyleExtractionResult,
  type StyleCommitInput,
  type StyleCommitResult,
  type ExtractedStyleDocument,
  type ExtractedVariant,
  type ExtractedPrice,
  type StyleExtractionMetadata,
  type ReviewedStyleDocument as AppReviewedStyleDocument,
  type ReviewedVariant,
  type ReviewedPrice,
  type ExtractionError,
  type CommitError as AppCommitError,
  STYLE_EXTRACTION_SERVICE_INFO,
} from './api/styleExtractionService'

// ACTIVE: Type definitions - used by persistence layer
export type {
  StyleDraft,
  StyleDraftStatus,
  LocalStyleImage,
  FabricScanType,
  ExtractedFabricData,
  StyleDraftStore,
} from './types/styleDraft'

export type {
  ExtractedPricePayload,
  ExtractedVariantPayload,
  ExtractedStylePayload,
  ExtractedFabricDocument,
  FabricExtractionMetadata,
  StyleReviewFormValues,
  VariantReviewFormValues,
  FabricReviewFormValues,
} from './types/fabricExtraction'

export type {
  ReviewedStyleDocument,
  ReviewedVariantDocument,
  ReviewedPriceDocument,
  ReviewedInventoryDocument,
  ReviewedFabricDocument,
  FabricImageReference,
  CommitFabricPayload,
  CommitFabricResponse,
  CommitError,
  CommitErrorType,
} from './types/fabricCommit'
