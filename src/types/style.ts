/**
 * Style Types
 *
 * Shared types for fabric style entities.
 */

/**
 * Confidence level for extraction fields
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * Result of style extraction from an Info image.
 */
export type StyleExtractionResult = {
  /** Extraction status */
  status: 'success' | 'failed'

  /** When extraction was performed */
  extractedAt: string

  /** ID of the source image used for extraction */
  sourceImageId: string

  /** Per-field confidence scores */
  confidence: {
    name?: ConfidenceLevel
    itemCode?: ConfidenceLevel
    composition?: ConfidenceLevel
    category?: ConfidenceLevel
    construction?: ConfidenceLevel
    finish?: ConfidenceLevel
    pattern?: ConfidenceLevel
    widthCm?: ConfidenceLevel
    widthIn?: ConfidenceLevel
    weightGsm?: ConfidenceLevel
    weightOzsy?: ConfidenceLevel
    season?: ConfidenceLevel
    price?: ConfidenceLevel
    currency?: ConfidenceLevel
    priceUnit?: ConfidenceLevel
  }

  /** Extracted field values - matches ExtractedStylePayload structure */
  fields: {
    itemCode: string
    name: string
    composition: string
    category: string
    construction: string
    finish: string
    pattern: string
    widthCm: string
    widthIn: string
    weightGsm: string
    weightOzsy: string
    season: string
    price: string
    currency: string
    priceUnit: string
  }

  /** Any warnings or issues during extraction */
  warnings: string[]
}

/**
 * Style image record
 */
export interface StyleImageRecord {
  id: string
  uri: string
  caption?: string
}

/**
 * Extraction metadata from the AI processing
 */
export interface StyleExtractionMeta {
  extractedAt: string
  warnings: string[]
}

/**
 * Complete style record for the mock store
 */
export interface StyleRecord {
  /** Unique style identifier */
  id: string

  /** Vendor this style belongs to */
  vendorId: string

  /** Style name */
  styleName: string

  /** Material composition */
  composition: string

  /** Color description */
  color: string

  /** Fabric weight */
  weight: string

  /** Fabric width */
  width: string

  /** Price */
  price: string

  /** Latest structured price from price_history (null if none recorded) */
  latestPrice?: {
    price: number
    currency: string
    priceUnit: string
  } | null

  /** SKU / item code */
  sku: string

  /** Supplier reference */
  supplierRef: string

  /** Additional notes */
  notes: string

  /** Fabric category (e.g. woven, knit, non-woven) */
  category?: string

  /** Season (e.g. Spring/Summer 2026) */
  season?: string

  /** Status (active, sample, discontinued) */
  status?: string

  /** Whether the style is shortlisted/favourited */
  isShortlisted?: boolean

  /** All images associated with this style */
  images: StyleImageRecord[]

  /** ID of the original Info image used for extraction */
  sourceInfoImageId?: string

  /** When the style was created */
  createdAt: string

  /** Extraction metadata if AI was used */
  extractionMeta?: StyleExtractionMeta
}

/**
 * Form for creating a style record from extraction result
 */
export interface StyleRecordCreateInput {
  vendorId: string
  styleName: string
  composition: string
  color: string
  weight: string
  width: string
  price: string
  sku: string
  supplierRef: string
  notes: string
  category?: string
  season?: string
  status?: string
  images: StyleImageRecord[]
  sourceInfoImageId?: string
  extractionMeta?: StyleExtractionMeta
}

/**
 * Convert extraction result fields to style record input
 */
export function extractionToStyleRecordInput(
  extractionFields: {
    styleName: string
    composition: string
    color: string
    weight: string
    width: string
    price: string
    sku: string
    supplierRef: string
    notes: string
  },
  vendorId: string,
  images: StyleImageRecord[],
  sourceInfoImageId?: string,
  extractionMeta?: StyleExtractionMeta
): StyleRecordCreateInput {
  return {
    vendorId,
    styleName: extractionFields.styleName,
    composition: extractionFields.composition,
    color: extractionFields.color,
    weight: extractionFields.weight,
    width: extractionFields.width,
    price: extractionFields.price,
    sku: extractionFields.sku,
    supplierRef: extractionFields.supplierRef,
    notes: extractionFields.notes,
    images,
    sourceInfoImageId,
    extractionMeta,
  }
}
