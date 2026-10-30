/**
 * Zod schemas for JSONB fields in the database.
 *
 * These schemas validate data at trust boundaries:
 * - Edge function responses (AI extraction results)
 * - Supabase query results (reading from DB)
 * - User-reviewed payloads (before commit)
 *
 * Each schema corresponds to a JSONB column in the database.
 * Feeding malformed data through parse() throws ZodError.
 */

import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Validation')

// ============================================================================
// Vendor extraction JSONB schemas
// ============================================================================

/**
 * Schema for vendors.brand_names (jsonb, default '[]')
 * Array of brand name strings.
 */
export const brandNamesSchema = z.array(z.string())

/**
 * Schema for vendors.extraction_warnings (jsonb, default '[]')
 * Array of warning message strings from AI extraction.
 */
export const vendorWarningsSchema = z.array(z.string())

/**
 * Schema for scan_sessions.confidence_scores (jsonb)
 * Object mapping field names to confidence values (0-1).
 */
export const confidenceScoresSchema = z.record(
  z.string(),
  z.number().min(0).max(1)
)

// ============================================================================
// Extraction payload JSONB schemas
// ============================================================================

/**
 * Schema for the normalized vendor document stored in scan_sessions.normalized_payload.
 * This is the structured extraction result from AI processing.
 */
export const normalizedVendorPayloadSchema = z.object({
  company_name: z.string(),
  booth_number: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  website_url: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  country_of_origin: z.string().nullable().optional(),
  brand_names: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
})

/**
 * Schema for the reviewed vendor document stored in scan_sessions.reviewed_payload.
 * User has confirmed/edited the extraction result.
 */
export const reviewedVendorPayloadSchema = normalizedVendorPayloadSchema.extend({
  company_name: z.string().min(1, 'Company name is required'),
})

/**
 * Schema for the normalized fabric style document stored in scan_sessions.normalized_payload.
 */
export const normalizedFabricPayloadSchema = z.object({
  style: z.object({
    item_code: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    composition: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    construction: z.string().nullable().optional(),
    finish: z.string().nullable().optional(),
    width_cm: z.number().positive().nullable().optional(),
    width_in: z.number().positive().nullable().optional(),
    weight_gsm: z.number().positive().nullable().optional(),
    weight_ozsy: z.number().positive().nullable().optional(),
    pattern: z.string().nullable().optional(),
    season: z.string().nullable().optional(),
  }),
  variants: z.array(z.object({
    color_name: z.string().nullable().optional(),
    color_code: z.string().nullable().optional(),
    variant_name: z.string().nullable().optional(),
  })).optional(),
  inventory: z.array(z.object({
    quantity: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
  })).optional(),
  prices: z.array(z.object({
    variant_index: z.number().nullable().optional(),
    price: z.object({
      currency: z.string().nullable().optional(),
      price: z.number().nullable().optional(),
      price_unit: z.string().nullable().optional(),
      minimum_order_quantity: z.number().nullable().optional(),
    }).nullable().optional(),
  })).optional(),
})

/**
 * Schema for the reviewed fabric document stored in scan_sessions.reviewed_payload.
 */
export const reviewedFabricPayloadSchema = normalizedFabricPayloadSchema

/**
 * Schema for scan_sessions.raw_payload (jsonb)
 * The raw AI extraction response. Less strict since it's the unprocessed output.
 */
export const rawPayloadSchema = z.record(z.string(), z.unknown())

// ============================================================================
// Metadata JSONB schemas
// ============================================================================

/**
 * Schema for fabric_styles.metadata (jsonb, default '{}')
 * Flexible key-value object for additional fabric data.
 */
export const fabricMetadataSchema = z.record(z.string(), z.unknown())

/**
 * Schema for fabric_styles.extraction_warnings (jsonb, default '[]')
 */
export const fabricWarningsSchema = z.array(z.string())

/**
 * Schema for drafts.payload (jsonb)
 * Complete draft state serialized as JSON.
 */
export const draftPayloadSchema = z.record(z.string(), z.unknown())

// ============================================================================
// Helpers
// ============================================================================

/**
 * Safely parse a JSONB field with a Zod schema.
 * Returns the parsed data or null if parsing fails.
 * Logs the error but does not throw — for use in data-loading paths.
 */
export function safeParseJsonb<T>(
  schema: z.ZodType<T>,
  data: unknown,
  fieldName: string,
): T | null {
  const result = schema.safeParse(data)
  if (!result.success) {
    logger.warn(`JSONB parse warning for ${fieldName}`, { error: result.error.message })
    return null
  }
  return result.data
}

/**
 * Strictly parse a JSONB field with a Zod schema.
 * Throws ZodError if data is malformed — for use at trust boundaries.
 */
export function strictParseJsonb<T>(
  schema: z.ZodType<T>,
  data: unknown,
  _fieldName: string,
): T {
  return schema.parse(data)
}
