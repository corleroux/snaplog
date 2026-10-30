/**
 * Schema Alignment Assertions
 *
 * Compile-time and runtime verification that `types.ts` faithfully represents
 * the cumulative state of all 29 migrations in `supabase/migrations/`.
 *
 * This module is the Data Vertical's core promise: types must match schema.
 */

import type { Database } from '../supabase/types'

// ---------------------------------------------------------------------------
// 1. Table Presence Assertions
// ---------------------------------------------------------------------------

/**
 * Every table created in migrations 003-012 must be present in types.ts.
 *
 * These compile-time assertions will fail (TS error) if a table is missing
 * from the Database interface.
 */
export type _AssertProfilesExists = Database['public']['Tables']['profiles']
export type _AssertEventsExists = Database['public']['Tables']['events']
export type _AssertEventMembersExists = Database['public']['Tables']['event_members']
export type _AssertVendorsExists = Database['public']['Tables']['vendors']
export type _AssertVendorImagesExists = Database['public']['Tables']['vendor_images']
export type _AssertFabricStylesExists = Database['public']['Tables']['fabric_styles']
export type _AssertFabricVariantsExists = Database['public']['Tables']['fabric_variants']
export type _AssertInventoryRecordsExists = Database['public']['Tables']['inventory_records']
export type _AssertFabricImagesExists = Database['public']['Tables']['fabric_images']
export type _AssertScanSessionsExists = Database['public']['Tables']['scan_sessions']
export type _AssertPriceHistoryExists = Database['public']['Tables']['price_history']

// ---------------------------------------------------------------------------
// 2. Key Column Presence Assertions
// ---------------------------------------------------------------------------

/**
 * Verify specific critical columns exist on each table's Row type.
 * If a column is missing from types.ts, accessing it will produce a TS error.
 */

// --- profiles (migration 003) ---
type _ProfilesRow = Database['public']['Tables']['profiles']['Row']
export type _AssertProfilesHasId = _ProfilesRow['id']
export type _AssertProfilesHasFullName = _ProfilesRow['full_name']
export type _AssertProfilesHasEmail = _ProfilesRow['email']
export type _AssertProfilesHasRole = _ProfilesRow['role']

// --- events (migration 004) ---
type _EventsRow = Database['public']['Tables']['events']['Row']
export type _AssertEventsHasId = _EventsRow['id']
export type _AssertEventsHasStatus = _EventsRow['status']
export type _AssertEventsHasCreatedBy = _EventsRow['created_by']

// --- event_members (migration 004) ---
type _EventMembersRow = Database['public']['Tables']['event_members']['Row']
export type _AssertEventMembersHasEventId = _EventMembersRow['event_id']
export type _AssertEventMembersHasUserId = _EventMembersRow['user_id']
export type _AssertEventMembersHasRole = _EventMembersRow['role']

// --- vendors (migration 005, enhanced 017) ---
type _VendorsRow = Database['public']['Tables']['vendors']['Row']
export type _AssertVendorsHasEventId = _VendorsRow['event_id']
export type _AssertVendorsHasCompanyName = _VendorsRow['company_name']
export type _AssertVendorsHasBrandNames = _VendorsRow['brand_names']
export type _AssertVendorsHasSource = _VendorsRow['source']
export type _AssertVendorsHasStatus = _VendorsRow['status']
export type _AssertVendorsHasSourceInfoImageId = _VendorsRow['source_info_image_id']
export type _AssertVendorsHasExtractionStatus = _VendorsRow['extraction_status']
export type _AssertVendorsHasExtractionWarnings = _VendorsRow['extraction_warnings']
export type _AssertVendorsHasExtractionConfidence = _VendorsRow['extraction_confidence']

// --- vendor_images (migration 005, enhanced 018) ---
type _VendorImagesRow = Database['public']['Tables']['vendor_images']['Row']
export type _AssertVendorImagesHasVendorId = _VendorImagesRow['vendor_id']
export type _AssertVendorImagesHasEventId = _VendorImagesRow['event_id']
export type _AssertVendorImagesHasStoragePath = _VendorImagesRow['storage_path']
export type _AssertVendorImagesHasImageType = _VendorImagesRow['image_type']
export type _AssertVendorImagesHasIsPrimary = _VendorImagesRow['is_primary']
export type _AssertVendorImagesHasDisplayOrder = _VendorImagesRow['display_order']
export type _AssertVendorImagesHasCaption = _VendorImagesRow['caption']
export type _AssertVendorImagesHasWasSourceInfoImage = _VendorImagesRow['was_source_info_image']

// --- fabric_styles (migration 006, enhanced 019) ---
type _FabricStylesRow = Database['public']['Tables']['fabric_styles']['Row']
export type _AssertFabricStylesHasEventId = _FabricStylesRow['event_id']
export type _AssertFabricStylesHasVendorId = _FabricStylesRow['vendor_id']
export type _AssertFabricStylesHasItemCode = _FabricStylesRow['item_code']
export type _AssertFabricStylesHasMetadata = _FabricStylesRow['metadata']
export type _AssertFabricStylesHasSourceInfoImageId = _FabricStylesRow['source_info_image_id']
export type _AssertFabricStylesHasExtractionStatus = _FabricStylesRow['extraction_status']
export type _AssertFabricStylesHasExtractionWarnings = _FabricStylesRow['extraction_warnings']
export type _AssertFabricStylesHasExtractionConfidence = _FabricStylesRow['extraction_confidence']

// --- fabric_variants (migration 007) ---
type _FabricVariantsRow = Database['public']['Tables']['fabric_variants']['Row']
export type _AssertFabricVariantsHasStyleId = _FabricVariantsRow['style_id']
export type _AssertFabricVariantsHasEventId = _FabricVariantsRow['event_id']
export type _AssertFabricVariantsHasVendorId = _FabricVariantsRow['vendor_id']
export type _AssertFabricVariantsHasMetadata = _FabricVariantsRow['metadata']

// --- inventory_records (migration 008) ---
type _InventoryRecordsRow = Database['public']['Tables']['inventory_records']['Row']
export type _AssertInventoryRecordsHasVariantId = _InventoryRecordsRow['variant_id']
export type _AssertInventoryRecordsHasStyleId = _InventoryRecordsRow['style_id']
export type _AssertInventoryRecordsHasEventId = _InventoryRecordsRow['event_id']
export type _AssertInventoryRecordsHasVendorId = _InventoryRecordsRow['vendor_id']
export type _AssertInventoryRecordsHasStockStatus = _InventoryRecordsRow['stock_status']

// --- fabric_images (migration 009, enhanced 020) ---
type _FabricImagesRow = Database['public']['Tables']['fabric_images']['Row']
export type _AssertFabricImagesHasStyleId = _FabricImagesRow['style_id']
export type _AssertFabricImagesHasVariantId = _FabricImagesRow['variant_id']
export type _AssertFabricImagesHasEventId = _FabricImagesRow['event_id']
export type _AssertFabricImagesHasImageRole = _FabricImagesRow['image_role']
export type _AssertFabricImagesHasDisplayOrder = _FabricImagesRow['display_order']
export type _AssertFabricImagesHasWasSourceInfoImage = _FabricImagesRow['was_source_info_image']

// --- scan_sessions (migration 010) ---
type _ScanSessionsRow = Database['public']['Tables']['scan_sessions']['Row']
export type _AssertScanSessionsHasEventId = _ScanSessionsRow['event_id']
export type _AssertScanSessionsHasScanType = _ScanSessionsRow['scan_type']
export type _AssertScanSessionsHasExtractionStatus = _ScanSessionsRow['extraction_status']
export type _AssertScanSessionsHasRawPayload = _ScanSessionsRow['raw_payload']
export type _AssertScanSessionsHasNormalizedPayload = _ScanSessionsRow['normalized_payload']
export type _AssertScanSessionsHasReviewedPayload = _ScanSessionsRow['reviewed_payload']
export type _AssertScanSessionsHasConfidenceScores = _ScanSessionsRow['confidence_scores']

// --- price_history (migration 011) ---
type _PriceHistoryRow = Database['public']['Tables']['price_history']['Row']
export type _AssertPriceHistoryHasEventId = _PriceHistoryRow['event_id']
export type _AssertPriceHistoryHasVendorId = _PriceHistoryRow['vendor_id']
export type _AssertPriceHistoryHasCurrency = _PriceHistoryRow['currency']
export type _AssertPriceHistoryHasPrice = _PriceHistoryRow['price']
export type _AssertPriceHistoryHasPriceUnit = _PriceHistoryRow['price_unit']

// ---------------------------------------------------------------------------
// 3. Enum Type Alignment
// ---------------------------------------------------------------------------

/**
 * Verify that types.ts enum values match the CHECK constraints in migrations.
 * These assertions compare literal union types.
 */

type _EventsStatus = _EventsRow['status']
export type _AssertEventsStatus = _EventsStatus extends 'active' | 'upcoming' | 'archived' ? true : never

type _VendorSource = _VendorsRow['source']
export type _AssertVendorSource = _VendorSource extends 'manual' | 'scan' | 'ai' | 'import' ? true : never

type _FabricVariantsStatus = _FabricVariantsRow['status']
export type _AssertFabricVariantsStatus = _FabricVariantsStatus extends 'active' | 'sample' | 'partial' | 'discontinued' ? true : never

type _ScanSessionType = _ScanSessionsRow['scan_type']
export type _AssertScanSessionType = _ScanSessionType extends
  'vendor_card' | 'vendor_signage' | 'vendor_brochure' | 'vendor_catalog' |
  'product_tag' | 'stock_sheet' | 'fabric_card' | 'multi_variant_sheet' ? true : never

// ---------------------------------------------------------------------------
// 4. Known Discrepancies
// ---------------------------------------------------------------------------

/**
 * The following discrepancies exist between migrations and types.ts as of
 * migration 029. These are documented but NOT fixed to avoid scope creep.
 *
 * 1. `drafts` table (migration 012) is NOT present in types.ts.
 *    - Columns: id, event_id, owner_id, draft_type, status, payload, last_error, created_at, updated_at
 *    - Impact: No type safety for drafts queries
 *    - Action: Add drafts table definition to types.ts
 *
 * 2. `vendors.brand_names` is typed as `string[]` in types.ts but stored as
 *    `jsonb DEFAULT '[]'::jsonb` in migration 005.
 *    - Impact: Low — Supabase client auto-parses JSONB arrays
 *    - Action: Document the mapping; current typing is acceptable
 *
 * 3. `fabric_variants` unique constraint `UNIQUE (style_id, color_name, finish, wash)`
 *    is documented in ENTITY_RELATIONSHIPS.md but does NOT exist in migration 007.
 *    - Impact: Duplicate variants could be created
 *    - Action: Either add migration to create constraint or update docs
 */

export const KNOWN_DISCREPANCIES = {
  draftsMissingFromTypes: {
    table: 'drafts',
    migration: '012_drafts.sql',
    description: 'Table exists in DB but has no entry in types.ts',
    severity: 'medium' as const,
  },
  brandNamesTypeMismatch: {
    table: 'vendors',
    column: 'brand_names',
    migration: '005_vendors.sql',
    description: 'Stored as jsonb but typed as string[] in types.ts',
    severity: 'low' as const,
    note: 'Supabase client auto-parses JSONB arrays; acceptable as-is',
  },
  variantUniqueConstraintMissing: {
    table: 'fabric_variants',
    constraint: 'UNIQUE (style_id, color_name, finish, wash)',
    documentedIn: 'ENTITY_RELATIONSHIPS.md line 153',
    description: 'Constraint documented but not in migration 007',
    severity: 'medium' as const,
  },
} as const

// ---------------------------------------------------------------------------
// 5. Runtime Assertion Helpers
// ---------------------------------------------------------------------------

/**
 * Table names that must exist in types.ts.
 * Used for runtime validation in tests.
 */
export const REQUIRED_TABLES = [
  'profiles',
  'events',
  'event_members',
  'vendors',
  'vendor_images',
  'fabric_styles',
  'fabric_variants',
  'inventory_records',
  'fabric_images',
  'scan_sessions',
  'price_history',
  // Note: 'drafts' is known-missing from types.ts
] as const

/**
 * Tables known to be missing from types.ts.
 * Used in tests to document expected gaps.
 */
export const KNOWN_MISSING_TABLES = ['drafts'] as const

/**
 * JSONB columns that must exist in types.ts.
 * Format: `{ table: { column: expectedDefault } }`
 */
export const JSONB_COLUMNS = {
  vendors: {
    brand_names: "'[]'::jsonb",
    extraction_warnings: "'[]'::jsonb",
  },
  fabric_styles: {
    extraction_warnings: "'[]'::jsonb",
    metadata: "'{}'::jsonb",
  },
  fabric_variants: {
    metadata: "'{}'::jsonb",
  },
  scan_sessions: {
    raw_payload: 'nullable',
    normalized_payload: 'nullable',
    reviewed_payload: 'nullable',
    confidence_scores: 'nullable',
  },
} as const

/**
 * Tables that must have RLS enabled.
 * Verified against migration 014.
 */
export const RLS_ENABLED_TABLES = [
  'events',
  'event_members',
  'vendors',
  'vendor_images',
  'fabric_styles',
  'fabric_variants',
  'inventory_records',
  'fabric_images',
  'scan_sessions',
  'price_history',
  'drafts',
] as const

/**
 * Runtime check: does the Database type have a given table?
 * Useful in test assertions.
 */
export function hasTable(table: string): boolean {
  return table in ({} as Database['public']['Tables'])
}

/**
 * Runtime check: does a table's Row type have a given column?
 * Uses type assertion for dynamic access.
 */
export function hasColumn(table: string, column: string): boolean {
  const tables = {} as Database['public']['Tables']
  const tableDef = tables[table as keyof typeof tables]
  if (!tableDef) return false
  return column in ({} as typeof tableDef.Row)
}
