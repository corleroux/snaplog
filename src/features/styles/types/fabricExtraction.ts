/**
 * Fabric extraction types for AI-based fabric/style data extraction.
 *
 * These types represent the contract between:
 * - AI extraction service (edge function)
 * - Frontend review screen
 * - Final commit payload
 *
 * Fabric-specific naming is intentional to avoid generic product abstractions.
 */

/**
 * Extracted price data from fabric documents.
 *
 * Represents commercial terms extracted from price lists or stock sheets.
 */
export interface ExtractedPricePayload {
  currency?: string | null
  price?: number | null
  price_unit?: string | null           // e.g., 'meter', 'yard', 'piece'
  minimum_order_quantity?: number | null
  minimum_order_unit?: string | null
  lead_time_value?: number | null
  lead_time_unit?: string | null       // 'days', 'weeks', 'months'
  notes?: string | null
}

/**
 * Extracted variant data from fabric documents.
 *
 * Represents color, wash, finish, or batch variations of a fabric style.
 * Includes inventory and price information when available.
 *
 * PRICE MODEL: Prices are variant-level.
 * Different variants (e.g., different colors or washes) may have different prices.
 * This matches the reality of textile trade where pricing varies by color/wash.
 */
export interface ExtractedVariantPayload {
  color_code?: string | null
  color_name?: string | null
  variant_name?: string | null         // Custom variant description
  wash_code?: string | null            // For denim wash variations
  finish_override?: string | null      // Variant-specific finish
  quantity?: number | null             // Observed stock quantity
  unit?: string | null                 // 'meters', 'yards', 'pieces'
  batch_no?: string | null             // Batch or lot number
  metadata?: Record<string, unknown> | null
  price?: ExtractedPricePayload | null // Variant-level pricing
}

/**
 * Extracted fabric style document from AI extraction.
 *
 * This is the normalized output from the AI extraction service,
 * populated in the scan_session's normalized_payload field.
 *
 * Uses camelCase for frontend with database snake_case mapping
 * handled at commit boundaries.
 */
export interface ExtractedStylePayload {
  // Primary identification
  item_code?: string | null            // Style/product code
  name?: string | null                 // Style name
  composition?: string | null          // Fiber content (e.g., "100% Cotton")

  // Categorization
  category?: string | null             // Product category
  construction?: string | null         // Weave/knit type (e.g., "Plain Weave")
  finish?: string | null               // Surface finish (e.g., "Calendered")
  pattern?: string | null              // Pattern type (e.g., "Solid", "Stripe")

  // Physical measurements
  width_cm?: number | null             // Width in centimeters
  width_in?: number | null             // Width in inches
  weight_gsm?: number | null           // Weight in g/m²
  weight_ozsy?: number | null          // Weight in oz/yd²

  // Season and market info
  season?: string | null               // Season identifier (e.g., "SS25", "FW25")

  // Optional metadata for unstructured additional data
  metadata?: Record<string, unknown> | null

  // Variants and pricing
  variants?: ExtractedVariantPayload[] | null
}

/**
 * Complete extraction response including document and metadata.
 *
 * This structure is stored in scan_sessions.normalized_payload
 * after AI extraction completes.
 */
export interface ExtractedFabricDocument {
  style: ExtractedStylePayload
  metadata: FabricExtractionMetadata
}

/**
 * Fabric extraction response from edge function.
 *
 * Alias for ExtractedFabricDocument for clarity in API layer.
 */
export type FabricExtractionResponse = ExtractedFabricDocument

/**
 * Extraction metadata from the AI service.
 *
 * Tracks which extraction model was used for debugging,
 * prompt iteration, and model comparison.
 */
export interface FabricExtractionMetadata {
  extractor_name: string
  extractor_model: string
  extractor_version: string
  confidence_scores?: Record<string, number>
  extraction_timestamp?: string
}

/**
 * Review form values for fabric style review screen.
 *
 * Matches the editable fields in the review UI.
 * All fields are strings for form input handling.
 *
 * Style section
 */
export interface StyleReviewFormValues {
  item_code: string
  name: string
  composition: string
  category: string
  construction: string
  finish: string
  width_cm: string
  width_in: string
  weight_gsm: string
  weight_ozsy: string
  pattern: string
  season: string
  metadata: string
}

/**
 * Review form values for a single variant.
 *
 * Nested form for editing individual variant data.
 */
export interface VariantReviewFormValues {
  color_code: string
  color_name: string
  variant_name: string
  wash_code: string
  finish_override: string
  quantity: string
  unit: string
  batch_no: string
  metadata: string
  // Price fields
  price_currency: string
  price_value: string
  price_unit: string
  minimum_order_quantity: string
  minimum_order_unit: string
  lead_time_value: string
  lead_time_unit: string
  price_notes: string
}

/**
 * Complete fabric review form including style and variants.
 */
export interface FabricReviewFormValues {
  style: StyleReviewFormValues
  variants: VariantReviewFormValues[]
}
