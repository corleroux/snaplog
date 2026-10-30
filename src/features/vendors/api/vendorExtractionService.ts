/**
 * Unified Vendor Extraction Service
 *
 * APP-FACING CONTRACT - Canonical Vendor terminology
 *
 * This service provides the canonical app-facing interface for vendor extraction,
 * hiding the underlying edge-function implementation details.
 *
 * ARCHITECTURE:
 * - App layer uses: extractVendor(), commitVendor()
 * - Service delegates to: extract-vendor-document, commit-reviewed-vendor-document
 * - Edge functions remain unchanged for now
 *
 * LIFECYCLE RULES:
 * - Extraction creates scan_sessions with audit payloads
 * - Commit writes business rows (vendors, vendor_images)
 * - Edit flows are manual-only, no extraction
 *
 * @module vendorExtractionService
 */

import {
  extractVendorDocument,
  getVendorExtractionStatus as getVendorExtractionStatusFromAdapter,
  isVendorExtractionComplete as isVendorExtractionCompleteFromAdapter,
} from '@/features/vendors/api/extractVendorDocument'
import { commitReviewedVendor } from '@/features/vendors/api/commitReviewedVendor'
import type { VendorExtractionResponse } from '@/features/vendors/types/vendorExtraction'
import type { ReviewedVendorDocument as SnakeReviewedVendorDocument } from '@/features/vendors/types/vendorCommit'
import { toCamelCase, toSnakeCase } from '@/utils/caseMapping'

// ============================================================================
// APP-FACING TYPES - Canonical Vendor terminology
// ============================================================================

/**
 * App-facing vendor extraction request.
 *
 * Uses canonical Vendor terminology throughout.
 */
export interface VendorExtractionInput {
  /** Scan session ID for audit tracking */
  scanSessionId: string
  /** Event ID for the vendor */
  eventId: string
  /** Storage path to source image */
  storagePath: string
  /** MIME type of source image */
  mimeType: string
  /** Scan type for extraction context */
  scanType: 'vendor_card' | 'vendor_signage' | 'vendor_brochure' | 'vendor_catalog'
}

/**
 * App-facing vendor extraction result.
 *
 * Contains extracted vendor data with metadata.
 */
export interface VendorExtractionResult {
  /** Extracted vendor document */
  document: AppExtractedVendorDocument
  /** Extraction metadata */
  metadata: VendorExtractionMetadata
}

/**
 * App-facing vendor document with camelCase properties.
 */
export interface AppExtractedVendorDocument {
  companyName: string
  boothNumber?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  website?: string | null
  address?: string | null
  countryOfOrigin?: string | null
  brandNames?: string[] | null
  notes?: string | null
}

/**
 * App-facing extraction metadata with camelCase properties.
 */
export interface VendorExtractionMetadata {
  extractorName: string
  extractorModel: string
  extractorVersion: string
  extractedAt?: string
  confidenceScores?: Record<string, number>
}

/**
 * App-facing reviewed vendor document with camelCase properties.
 */
export interface ReviewedVendorDocument {
  companyName: string
  boothNumber?: string | null
  contactPerson?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  website?: string | null
  address?: string | null
  countryOfOrigin?: string | null
  brandNames?: string[] | null
  notes?: string | null
}

/**
 * App-facing vendor commit request.
 *
 * Uses canonical Vendor terminology throughout.
 */
export interface VendorCommitInput {
  /** Scan session ID for audit tracking */
  scanSessionId: string
  /** Event ID for the vendor */
  eventId: string
  /** Reviewed vendor document to commit */
  reviewedDocument: ReviewedVendorDocument
  /** Optional source image path */
  sourceImagePath?: string | null
  /** Optional source image URL */
  sourceImageUrl?: string | null
}

/**
 * App-facing vendor commit result.
 *
 * Contains IDs of created business records.
 */
export interface VendorCommitResult {
  /** Created vendor ID */
  vendorId: string
  /** Created vendor image IDs */
  vendorImageIds: string[]
}

// ============================================================================
// EXTRACTION SERVICE
// ============================================================================

/**
 * Extract vendor data from source image.
 *
 * This is the canonical app-facing extraction function.
 * It creates a scan session and calls the extraction edge function.
 *
 * The underlying edge function (extract-vendor-document) is hidden from the UI.
 *
 * @param input - Extraction input with canonical Vendor terminology
 * @returns Extracted vendor document with metadata
 * @throws ExtractionError if extraction fails
 *
 * @example
 * ```tsx
 * const result = await extractVendor({
 *   scanSessionId: 'session-123',
 *   eventId: 'event-456',
 *   storagePath: 'scans/vendor-card.jpg',
 *   mimeType: 'image/jpeg',
 *   scanType: 'vendor_card'
 * })
 * ```
 */
export async function extractVendor(
  input: VendorExtractionInput
): Promise<VendorExtractionResult> {
  // Map app-facing input to extraction adapter
  const response: VendorExtractionResponse = await extractVendorDocument({
    scanSessionId: input.scanSessionId,
    eventId: input.eventId,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    scanType: input.scanType,
  })

  // Return canonical app-facing result with camelCase properties
  // Note: website_url → website is an asymmetric mapping (not simple case conversion)
  const camelDocument = toCamelCase(response.document) as unknown as Record<string, unknown>
  if ('websiteUrl' in camelDocument) {
    camelDocument.website = camelDocument.websiteUrl
    delete camelDocument.websiteUrl
  }

  return {
    document: camelDocument as unknown as AppExtractedVendorDocument,
    metadata: toCamelCase(response.metadata) as unknown as VendorExtractionMetadata,
  }
}

/**
 * Check if vendor extraction is complete for a scan session.
 *
 * @param scanSessionId - Scan session ID
 * @returns true if extraction completed successfully
 */
export async function isVendorExtractionComplete(
  scanSessionId: string
): Promise<boolean> {
  return isVendorExtractionCompleteFromAdapter(scanSessionId)
}

/**
 * Get vendor extraction status.
 *
 * @param scanSessionId - Scan session ID
 * @returns Current extraction status
 */
export async function getVendorExtractionStatus(
  scanSessionId: string
): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string | null
}> {
  return getVendorExtractionStatusFromAdapter(scanSessionId)
}

// ============================================================================
// COMMIT SERVICE
// ============================================================================

/**
 * Commit reviewed vendor data.
 *
 * This is the canonical app-facing commit function.
 * It writes business rows (vendors, vendor_images) and updates scan session.
 *
 * The underlying edge function (commit-reviewed-vendor-document) is hidden from the UI.
 *
 * @param input - Commit input with canonical Vendor terminology
 * @returns Commit result with created record IDs
 * @throws CommitError if commit fails
 *
 * @example
 * ```tsx
 * const result = await commitVendor({
 *   scanSessionId: 'session-123',
 *   eventId: 'event-456',
 *   reviewedDocument: {
 *     company_name: 'Textile Fabrics Ltd',
 *     booth_number: 'A-123',
 *     // ... other fields
 *   },
 *   sourceImagePath: 'scans/vendor-card.jpg'
 * })
 * ```
 */
export async function commitVendor(
  input: VendorCommitInput
): Promise<VendorCommitResult> {
  // Map app-facing camelCase to snake_case for persistence layer
  // Note: website → website_url is an asymmetric mapping (not simple case conversion)
  const snakeCaseDocument = toSnakeCase(input.reviewedDocument) as unknown as Record<string, unknown>
  if ('website' in snakeCaseDocument) {
    snakeCaseDocument.website_url = snakeCaseDocument.website
    delete snakeCaseDocument.website
  }

  // Map app-facing input to commit adapter
  const response = await commitReviewedVendor({
    scanSessionId: input.scanSessionId,
    eventId: input.eventId,
    reviewedDocument: snakeCaseDocument as unknown as SnakeReviewedVendorDocument,
    sourceImagePath: input.sourceImagePath,
    sourceImageUrl: input.sourceImageUrl,
  })

  // Return canonical app-facing result (map snake_case to camelCase)
  // Note: vendor_image_id (singular) → vendorImageIds (plural array) is semantic, not case
  const camelResponse = toCamelCase(response) as Record<string, unknown>
  return {
    vendorId: camelResponse.vendorId as string,
    vendorImageIds: camelResponse.vendorImageId ? [camelResponse.vendorImageId as string] : [],
  }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Extraction error type.
 */
export type ExtractionError = {
  type: 'validation_failed' | 'network_error' | 'extraction_failed' | 'unknown_error'
  message: string
}

/**
 * Commit error type.
 */
export type CommitError = {
  type: 'validation_failed' | 'network_error' | 'commit_failed' | 'conflict' | 'unknown_error'
  message: string
  vendorId?: string
}

// ============================================================================
// SERVICE METADATA
// ============================================================================

/**
 * Service information for debugging and monitoring.
 */
export const VENDOR_EXTRACTION_SERVICE_INFO = {
  name: 'vendorExtractionService',
  version: '1.0.0',
  description: 'Canonical Vendor extraction service with app-facing contracts',
  underlyingEdgeFunctions: [
    'extract-vendor-document',
    'commit-reviewed-vendor-document',
  ],
  appFacingTerminology: 'Vendor',
  persistenceTerminology: 'vendors',
} as const
