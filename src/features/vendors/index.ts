/**
 * Vendor Feature Module
 *
 * Canonical vendor screens and vendor-specific UI live inside this feature.
 * Shared primitives remain in `src/components`.
 */

export * from './screens'
export * from './components'

// ACTIVE: Data fetching hooks - used by persistence layer
export { useVendors } from './hooks/useVendors'
export { useVendor } from './hooks/useVendor'
export { useVendorCaptureFlow } from './hooks/useVendorCaptureFlow'
export type { UseVendorCaptureFlowReturn, UseVendorCaptureFlowOptions } from './hooks/useVendorCaptureFlow'

// ACTIVE: TanStack Query hooks - additive cache layer
export {
  useVendorsQuery,
  useVendorQuery,
  useInvalidateVendors,
  useInvalidateVendor,
  vendorKeys,
} from './hooks/useVendorQueries'

// ACTIVE: API functions - used by persistence layer
export { getVendors } from './api/getVendors'
export { getVendor } from './api/getVendor'
export { updateVendor } from './api/updateVendor'
export { extractVendorDocument } from './api/extractVendorDocument'
export { commitReviewedVendor } from './api/commitReviewedVendor'
export {
  batchArchiveVendors,
  batchUpdateVendorCategory,
  batchTagVendors,
  batchExportVendors,
} from './api/batchUpdateVendors'

// ACTIVE: Repository exports - used by persistence layer
export { vendorRepository, createVendorRepository, type VendorRepository, type VendorCreateInput, type VendorUpdateInput } from './api/vendorRepository'
export { vendorRowToVendorRecord, vendorImageToVendorImageRecord } from './api/vendorMappers'
export {
  VendorRepositoryProvider,
  useVendorRepository,
  useVendorsForEvent,
  useVendor as useVendorFromRepository,
  type VendorRepositoryProviderProps,
} from './api/vendorRepositoryContext'

// ACTIVE: Extraction service - app-facing Vendor terminology
export {
  extractVendor,
  commitVendor,
  isVendorExtractionComplete,
  getVendorExtractionStatus,
  type VendorExtractionInput,
  type VendorExtractionResult,
  type VendorCommitInput,
  type VendorCommitResult,
  type ExtractionError,
  type CommitError,
  VENDOR_EXTRACTION_SERVICE_INFO,
} from './api/vendorExtractionService'

export type {
  VendorDraft,
  VendorDraftStatus,
  LocalVendorImage,
  VendorScanType,
  ExtractedVendorData,
  VendorDraftStore,
} from './types/vendorDraft'
export type {
  ExtractedVendorDocument,
  VendorReviewFormValues,
  FieldConfidence,
  ExtractionMetadata,
  VendorExtractionResponse,
} from './types/vendorExtraction'
export type {
  ReviewedVendorDocument,
  VendorImageReference,
  CommitVendorPayload,
  CommitVendorResponse,
  CommitErrorType,
  CommitError as VendorCommitError,
} from './types/vendorCommit'
