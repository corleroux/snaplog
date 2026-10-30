/**
 * Style/fabric capture draft types for local persistence.
 *
 * Drafts are stored locally before upload and scan session creation.
 * They support offline workflows and interrupted capture sessions.
 */

/**
 * Status of a style capture draft.
 */
export type StyleDraftStatus =
  | 'draft'           // Initial state, image selected
  | 'uploading'       // Image upload in progress
  | 'scan_created'    // Scan session created
  | 'extracting'      // AI extraction in progress
  | 'review'          // Ready for user review
  | 'committing'      // Committing to database
  | 'failed'          // Error occurred
  | 'completed'       // Fully committed

/**
 * Local image reference before upload.
 */
export interface LocalStyleImage {
  id: string
  uri: string                // Local file URI or blob URL
  name: string               // Original filename
  type: string               // MIME type
  size: number               // File size in bytes
  width?: number
  height?: number
  capturedAt: string
}

/**
 * Scan type for fabric/style capture.
 */
export type FabricScanType =
  | 'product_tag'
  | 'stock_sheet'
  | 'fabric_card'
  | 'multi_variant_sheet'

/**
 * Extracted fabric data (populated after AI extraction).
 *
 * Uses camelCase for frontend with snake_case aliases for database compatibility.
 * Allows null to match database nullable columns.
 */
export interface ExtractedFabricData {
  // Primary camelCase fields for frontend usage
  styleName?: string
  styleCode?: string
  composition?: string
  weight?: string
  width?: string
  colorName?: string
  colorCode?: string
  finish?: string
  pattern?: string
  usage?: string

  // Database-specific snake_case aliases (prefixed to avoid conflicts)
  db_style_name?: string
  db_style_code?: string
  db_weight_gsm?: string
  db_width_cm?: string
  db_color_name?: string
  db_color_code?: string
  db_notes?: string

  // Variants (if multi-variant sheet)
  variants?: Array<{
    colorName?: string
    colorCode?: string
    stockQuantity?: number
    price?: number
  }>
}

/**
 * Style/fabric capture draft - local state for style capture workflow.
 */
export interface StyleDraft {
  id: string
  eventId: string
  vendorId: string                // Required: style belongs to a vendor
  status: StyleDraftStatus
  localImages: LocalStyleImage[]
  scanSessionId: string | null
  scanType: FabricScanType
  sourceImagePaths: string[]      // Storage paths after upload (may be multiple)
  sourceImageUrls?: Array<string | null>  // Public URLs after upload (null if bucket is private)
  extractedFabric: ExtractedFabricData | null
  error: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Draft storage operations.
 */
export interface StyleDraftStore {
  save(draft: StyleDraft): Promise<void>
  get(id: string): Promise<StyleDraft | null>
  getAll(): Promise<StyleDraft[]>
  delete(id: string): Promise<void>
  update(id: string, updates: Partial<StyleDraft>): Promise<void>
}
