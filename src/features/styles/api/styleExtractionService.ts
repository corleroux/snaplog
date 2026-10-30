/**
 * Unified Style Extraction Service
 *
 * APP-FACING CONTRACT - Canonical Style terminology
 *
 * This service provides the canonical app-facing interface for style extraction,
 * hiding the underlying edge-function implementation details.
 *
 * ARCHITECTURE:
 * - App layer uses: extractStyle(), commitStyle()
 * - Service delegates to: extract-fabric-document, commit-reviewed-fabric-document
 * - Edge functions remain unchanged for now
 *
 * LIFECYCLE RULES:
 * - Extraction creates scan_sessions with audit payloads
 * - Commit writes business rows (fabric_styles, fabric_variants, etc.)
 * - Edit flows are manual-only, no extraction
 *
 * NOTE: The persistence layer still uses fabric_* table names.
 * This service provides the terminology seam between app (Style) and persistence (fabric).
 *
 * @module styleExtractionService
 */

import {
  extractFabricDocument,
  getFabricExtractionStatus as getFabricExtractionStatusFromAdapter,
  isFabricExtractionComplete as isFabricExtractionCompleteFromAdapter,
} from '@/features/styles/api/extractFabricDocument'
import { commitReviewedFabric } from '@/features/styles/api/commitReviewedFabricDocument'
import type {
  FabricExtractionResponse,
} from '@/features/styles/types/fabricExtraction'
import type {
  ReviewedFabricDocument as FabricCommitReviewedDocument,
  ReviewedVariantDocument as FabricCommitReviewedVariantDocument,
  ReviewedInventoryDocument,
  ReviewedPriceDocument,
} from '@/features/styles/types/fabricCommit'
import { toCamelCase, toSnakeCase } from '@/utils/caseMapping'

// ============================================================================
// APP-FACING TYPES - Canonical Style terminology
// ============================================================================

/**
 * App-facing style extraction request.
 *
 * Uses canonical Style terminology throughout.
 */
export interface StyleExtractionInput {
  /** Scan session ID for audit tracking */
  scanSessionId: string
  /** Event ID for the style */
  eventId: string
  /** Vendor ID for the style */
  vendorId: string
  /** Storage path to source image */
  storagePath: string
  /** MIME type of source image */
  mimeType: string
  /** Scan type for extraction context */
  scanType: 'product_tag' | 'stock_sheet' | 'fabric_card' | 'multi_variant_sheet'
}

/**
 * App-facing style extraction result.
 *
 * Contains extracted style data with metadata.
 */
export interface StyleExtractionResult {
  /** Extracted style document */
  document: ExtractedStyleDocument
  /** Extraction metadata */
  metadata: StyleExtractionMetadata
}

/**
 * App-facing extracted style document.
 *
 * Uses Style terminology instead of Fabric terminology.
 */
export interface ExtractedStyleDocument {
  /** Item code / SKU */
  itemCode?: string | null
  /** Style name */
  name?: string | null
  /** Material composition */
  composition?: string | null
  /** Category */
  category?: string | null
  /** Construction */
  construction?: string | null
  /** Finish */
  finish?: string | null
  /** Pattern */
  pattern?: string | null
  /** Width in cm */
  widthCm?: number | null
  /** Width in inches */
  widthIn?: number | null
  /** Weight in g/m² */
  weightGsm?: number | null
  /** Weight in oz/yd² */
  weightOzsy?: number | null
  /** Season */
  season?: string | null
  /** Custom metadata */
  metadata?: Record<string, unknown> | null
  /** Extracted variants */
  variants?: ExtractedVariant[] | null
}

/**
 * App-facing extracted variant.
 *
 * Uses Variant terminology.
 */
export interface ExtractedVariant {
  /** Color code */
  colorCode?: string | null
  /** Color name */
  colorName?: string | null
  /** Variant name */
  variantName?: string | null
  /** Wash code */
  washCode?: string | null
  /** Finish override */
  finishOverride?: string | null
  /** Quantity */
  quantity?: number | null
  /** Unit */
  unit?: string | null
  /** Batch number */
  batchNo?: string | null
  /** Custom metadata */
  metadata?: Record<string, unknown> | null
  /** Price data */
  price?: ExtractedPrice | null
}

/**
 * App-facing extracted price.
 */
export interface ExtractedPrice {
  /** Currency */
  currency?: string | null
  /** Price */
  price?: number | null
  /** Price unit */
  priceUnit?: string | null
  /** Minimum order quantity */
  minimumOrderQuantity?: number | null
  /** Minimum order unit */
  minimumOrderUnit?: string | null
  /** Lead time value */
  leadTimeValue?: number | null
  /** Lead time unit */
  leadTimeUnit?: string | null
  /** Notes */
  notes?: string | null
}

/**
 * App-facing style extraction metadata.
 *
 * Uses Style terminology.
 */
export interface StyleExtractionMetadata {
  /** Extractor name */
  extractorName: string
  /** Extractor model */
  extractorModel: string
  /** Extractor version */
  extractorVersion: string
  /** Extraction timestamp */
  extractedAt?: string
  /** Confidence scores */
  confidenceScores?: Record<string, number>
}

/**
 * App-facing style commit request.
 *
 * Uses canonical Style terminology throughout.
 */
export interface StyleCommitInput {
  /** Scan session ID for audit tracking */
  scanSessionId: string
  /** Event ID for the style */
  eventId: string
  /** Vendor ID for the style */
  vendorId: string
  /** Reviewed style document to commit */
  reviewedDocument: ReviewedStyleDocument
  /** Optional source image path */
  sourceImagePath?: string | null
  /** Optional source image URL */
  sourceImageUrl?: string | null
}

/**
 * App-facing reviewed style document.
 *
 * Uses Style terminology.
 */
export interface ReviewedStyleDocument {
  /** Item code / SKU */
  itemCode?: string | null
  /** Style name */
  name?: string | null
  /** Material composition */
  composition?: string | null
  /** Category */
  category?: string | null
  /** Construction */
  construction?: string | null
  /** Finish */
  finish?: string | null
  /** Pattern */
  pattern?: string | null
  /** Width in cm */
  widthCm?: number | null
  /** Width in inches */
  widthIn?: number | null
  /** Weight in g/m² */
  weightGsm?: number | null
  /** Weight in oz/yd² */
  weightOzsy?: number | null
  /** Season */
  season?: string | null
  /** Custom metadata */
  metadata?: Record<string, unknown> | null
  /** Reviewed variants */
  variants?: ReviewedVariant[] | null
}

/**
 * App-facing reviewed variant.
 */
export interface ReviewedVariant {
  /** Color code */
  colorCode?: string | null
  /** Color name */
  colorName?: string | null
  /** Variant name */
  variantName?: string | null
  /** Wash code */
  washCode?: string | null
  /** Finish override */
  finishOverride?: string | null
  /** Quantity */
  quantity?: number | null
  /** Unit */
  unit?: string | null
  /** Batch number */
  batchNo?: string | null
  /** Custom metadata */
  metadata?: Record<string, unknown> | null
  /** Price data */
  price?: ReviewedPrice | null
}

/**
 * App-facing reviewed price.
 */
export interface ReviewedPrice {
  /** Currency */
  currency?: string | null
  /** Price */
  price?: number | null
  /** Price unit */
  priceUnit?: string | null
  /** Minimum order quantity */
  minimumOrderQuantity?: number | null
  /** Minimum order unit */
  minimumOrderUnit?: string | null
  /** Lead time value */
  leadTimeValue?: number | null
  /** Lead time unit */
  leadTimeUnit?: string | null
  /** Notes */
  notes?: string | null
}

/**
 * App-facing style commit result.
 *
 * Contains IDs of created business records.
 */
export interface StyleCommitResult {
  /** Created style ID (fabric_styles table) */
  styleId: string
  /** Created variant IDs (fabric_variants table) */
  variantIds: string[]
  /** Created inventory record IDs */
  inventoryIds: string[]
  /** Created price record IDs */
  priceIds: string[]
  /** Created image IDs (fabric_images table) */
  imageIds: string[]
}

// ============================================================================
// MAPPING UTILITIES - App ↔ Persistence (centralized case mapping)
// ============================================================================

/**
 * Map app-facing style extraction input to fabric extraction request.
 */
function mapToFabricExtractionRequest(input: StyleExtractionInput) {
  return {
    scanSessionId: input.scanSessionId,
    eventId: input.eventId,
    vendorId: input.vendorId,
    storagePath: input.storagePath,
    mimeType: input.mimeType,
    scanType: input.scanType,
  }
}

/**
 * Map fabric extraction response to app-facing style extraction result.
 *
 * Uses toCamelCase for recursive snake_case → camelCase key conversion.
 */
function mapFromFabricExtractionResponse(response: FabricExtractionResponse): StyleExtractionResult {
  const { style, metadata } = response

  return {
    document: toCamelCase<ExtractedStyleDocument>(style),
    metadata: {
      extractorName: metadata.extractor_name,
      extractorModel: metadata.extractor_model,
      extractorVersion: metadata.extractor_version,
      extractedAt: metadata.extraction_timestamp,
      confidenceScores: metadata.confidence_scores,
    },
  }
}

/**
 * Map app-facing reviewed style to fabric reviewed document.
 *
 * Uses toSnakeCase for recursive camelCase → snake_case key conversion.
 */
function mapToReviewedFabricDocument(style: ReviewedStyleDocument): FabricCommitReviewedDocument {
  const variants: FabricCommitReviewedVariantDocument[] =
    style.variants?.map(v => toSnakeCase<FabricCommitReviewedVariantDocument>(v)) || []

  const inventory: ReviewedInventoryDocument[] = variants.map((_, index) => ({
    variant_index: index,
    quantity: style.variants?.[index]?.quantity ?? null,
    unit: style.variants?.[index]?.unit ?? null,
    batch_no: style.variants?.[index]?.batchNo ?? null,
  }))

  const prices: Array<{ variant_index: number; price: ReviewedPriceDocument }> = []
  style.variants?.forEach((v, index) => {
    if (v.price) {
      prices.push({
        variant_index: index,
        price: toSnakeCase<ReviewedPriceDocument>(v.price),
      })
    }
  })

  return {
    style: toSnakeCase(style),
    variants,
    inventory,
    prices,
  }
}

// ============================================================================
// EXTRACTION SERVICE
// ============================================================================

/**
 * Extract style data from source image.
 *
 * This is the canonical app-facing extraction function.
 * It creates a scan session and calls the extraction edge function.
 *
 * The underlying edge function (extract-fabric-document) is hidden from the UI.
 *
 * @param input - Extraction input with canonical Style terminology
 * @returns Extracted style document with metadata
 * @throws ExtractionError if extraction fails
 *
 * @example
 * ```tsx
 * const result = await extractStyle({
 *   scanSessionId: 'session-123',
 *   eventId: 'event-456',
 *   vendorId: 'vendor-789',
 *   storagePath: 'scans/fabric-tag.jpg',
 *   mimeType: 'image/jpeg',
 *   scanType: 'fabric_card'
 * })
 * ```
 */
export async function extractStyle(
  input: StyleExtractionInput
): Promise<StyleExtractionResult> {
  // Map app-facing input to fabric extraction request
  const fabricRequest = mapToFabricExtractionRequest(input)

  // Call fabric extraction adapter
  const fabricResponse = await extractFabricDocument(fabricRequest)

  // Map fabric response to app-facing result
  return mapFromFabricExtractionResponse(fabricResponse)
}

/**
 * Check if style extraction is complete for a scan session.
 *
 * @param scanSessionId - Scan session ID
 * @returns true if extraction completed successfully
 */
export async function isStyleExtractionComplete(
  scanSessionId: string
): Promise<boolean> {
  return isFabricExtractionCompleteFromAdapter(scanSessionId)
}

/**
 * Get style extraction status.
 *
 * @param scanSessionId - Scan session ID
 * @returns Current extraction status
 */
export async function getStyleExtractionStatus(
  scanSessionId: string
): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string | null
}> {
  return getFabricExtractionStatusFromAdapter(scanSessionId)
}

// ============================================================================
// COMMIT SERVICE
// ============================================================================

/**
 * Commit reviewed style data.
 *
 * This is the canonical app-facing commit function.
 * It writes business rows (fabric_styles, fabric_variants, etc.) and updates scan session.
 *
 * The underlying edge function (commit-reviewed-fabric-document) is hidden from the UI.
 *
 * @param input - Commit input with canonical Style terminology
 * @returns Commit result with created record IDs
 * @throws CommitError if commit fails
 *
 * @example
 * ```tsx
 * const result = await commitStyle({
 *   scanSessionId: 'session-123',
 *   eventId: 'event-456',
 *   vendorId: 'vendor-789',
 *   reviewedDocument: {
 *     itemCode: 'TF-001',
 *     name: 'Cotton Poplin',
 *     composition: '100% Cotton',
 *     // ... other fields
 *   },
 *   sourceImagePath: 'scans/fabric-tag.jpg'
 * })
 * ```
 */
export async function commitStyle(
  input: StyleCommitInput
): Promise<StyleCommitResult> {
  // Map app-facing reviewed style to fabric reviewed document
  const fabricDocument = mapToReviewedFabricDocument(input.reviewedDocument)

  // Call fabric commit adapter
  const fabricResponse = await commitReviewedFabric({
    scanSessionId: input.scanSessionId,
    eventId: input.eventId,
    vendorId: input.vendorId,
    reviewedDocument: fabricDocument,
    sourceImagePaths: input.sourceImagePath ? [input.sourceImagePath] : undefined,
    sourceImageUrls: input.sourceImageUrl ? [input.sourceImageUrl] : undefined,
  })

  // Return app-facing result (map snake_case to camelCase)
  return toCamelCase<StyleCommitResult>({
    styleId: fabricResponse.style_id,
    variantIds: fabricResponse.variant_ids || [],
    inventoryIds: fabricResponse.inventory_ids || [],
    priceIds: fabricResponse.price_ids || [],
    imageIds: fabricResponse.fabric_image_ids || [],
  })
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
  styleId?: string
}

// ============================================================================
// SERVICE METADATA
// ============================================================================

/**
 * Service information for debugging and monitoring.
 */
export const STYLE_EXTRACTION_SERVICE_INFO = {
  name: 'styleExtractionService',
  version: '1.0.0',
  description: 'Canonical Style extraction service with app-facing contracts',
  underlyingEdgeFunctions: [
    'extract-fabric-document',
    'commit-reviewed-fabric-document',
  ],
  appFacingTerminology: 'Style',
  persistenceTerminology: 'fabric_styles',
} as const
