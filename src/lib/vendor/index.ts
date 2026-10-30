/**
 * Vendor Library
 *
 * Repository-backed persistence for vendor management.
 */

// Repository-backed providers and hooks (PRIMARY)
export {
  VendorRepositoryProvider,
  useVendorRepository,
  useVendorsForEvent,
  useVendorFromRepository as useVendor,
  vendorRepository,
  type VendorRepositoryProviderProps,
} from '@/features/vendors'

// Extraction services (app-facing Vendor terminology)
export {
  extractVendor,
  commitVendor,
  isVendorExtractionComplete,
  getVendorExtractionStatus,
  VENDOR_EXTRACTION_SERVICE_INFO,
  type VendorExtractionInput,
  type VendorExtractionResult,
  type VendorCommitInput,
  type VendorCommitResult,
  type ExtractionError,
  type CommitError,
} from '@/features/vendors'
