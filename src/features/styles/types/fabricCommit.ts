/**
 * Fabric commit types for the commit-reviewed-fabric-document flow.
 *
 * These types represent the contract between:
 * - Frontend review screen
 * - Backend commit edge function
 * - Final fabric_styles, fabric_variants, inventory_records, price_history, and fabric_images tables
 */

/**
 * Reviewed style document payload.
 *
 * This is the user-reviewed and confirmed style data that will be committed
 * to the fabric_styles table. It includes all editable fields from the review screen.
 */
export interface ReviewedStyleDocument {
  item_code?: string | null
  name?: string | null
  composition?: string | null
  category?: string | null
  construction?: string | null
  finish?: string | null
  pattern?: string | null
  width_cm?: number | null
  width_in?: number | null
  weight_gsm?: number | null
  weight_ozsy?: number | null
  season?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Reviewed variant document payload.
 *
 * User-reviewed variant data for fabric_variants table.
 * Represents color/wash/finish variations with inventory.
 */
export interface ReviewedVariantDocument {
  color_code?: string | null
  color_name?: string | null
  variant_name?: string | null
  wash_code?: string | null
  finish_override?: string | null
  quantity?: number | null
  unit?: string | null
  batch_no?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Reviewed price document payload.
 *
 * User-reviewed price data for price_history table.
 * Prices are variant-level to match textile trade reality.
 */
export interface ReviewedPriceDocument {
  currency?: string | null
  price?: number | null
  price_unit?: string | null
  minimum_order_quantity?: number | null
  minimum_order_unit?: string | null
  lead_time_value?: number | null
  lead_time_unit?: string | null
  notes?: string | null
}

/**
 * Reviewed inventory document payload.
 *
 * User-reviewed inventory data for inventory_records table.
 */
export interface ReviewedInventoryDocument {
  variant_index: number
  quantity?: number | null
  unit?: string | null
  batch_no?: string | null
}

/**
 * Complete reviewed fabric document payload.
 *
 * This is the full user-reviewed data that will be committed.
 * Separates style, variants, inventory, and price for proper table distribution.
 */
export interface ReviewedFabricDocument {
  style: ReviewedStyleDocument
  variants: ReviewedVariantDocument[]
  inventory: ReviewedInventoryDocument[]
  prices: Array<{
    variant_index?: number
    price: ReviewedPriceDocument
  }>
}

/**
 * Fabric image reference for commit.
 *
 * Links source images to the created fabric style record.
 */
export interface FabricImageReference {
  storage_path: string
  public_url?: string | null
}

/**
 * Commit payload for fabric style creation.
 *
 * This is sent to the commit-reviewed-fabric-document edge function.
 */
export interface CommitFabricPayload {
  scan_session_id: string
  event_id: string
  vendor_id: string
  reviewed_document: ReviewedFabricDocument
  source_images?: FabricImageReference[] | null
}

/**
 * Commit response from backend.
 *
 * Returns the created style ID and related record IDs.
 */
export interface CommitFabricResponse {
  style_id: string
  variant_ids: string[]
  inventory_ids: string[]
  price_ids: string[]
  fabric_image_ids: string[]
  scan_session_id: string
}

/**
 * Commit error types for better error handling.
 */
export type CommitErrorType =
  | 'validation_failed'
  | 'scan_session_not_found'
  | 'permission_denied'
  | 'style_creation_failed'
  | 'variant_creation_failed'
  | 'inventory_creation_failed'
  | 'price_creation_failed'
  | 'image_creation_failed'
  | 'scan_session_update_failed'
  | 'unknown_error'

export interface CommitError {
  type: CommitErrorType
  message: string
  details?: unknown
}
