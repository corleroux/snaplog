/**
 * Zod schemas for fabric extraction validation.
 *
 * These schemas validate:
 * - AI extraction responses
 * - Review form submissions
 * - Commit payloads
 *
 * They are used both in the frontend (React Hook Form validation)
 * and potentially in edge functions for payload validation.
 */

import { z } from 'zod'

/**
 * Positive number validation.
 * Ensures values are greater than zero when present.
 */
const positiveNumber = z.number().positive().nullable().optional()

/**
 * Non-negative number validation.
 * Ensures values are zero or greater when present.
 */
const nonNegativeNumber = z.number().nonnegative().nullable().optional()

/**
 * Stringified number validation for form inputs.
 * Accepts string that can be parsed to a number.
 */
const stringNumber = z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number').optional()

/**
 * Extracted price payload schema.
 *
 * Validates commercial terms extracted from price lists.
 */
export const extractedPricePayloadSchema = z.object({
  currency: z.string().nullable().optional(),
  price: positiveNumber,
  price_unit: z.string().nullable().optional(),
  minimum_order_quantity: positiveNumber,
  minimum_order_unit: z.string().nullable().optional(),
  lead_time_value: positiveNumber,
  lead_time_unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

/**
 * Extracted variant payload schema.
 *
 * Validates color/wash/finish variations with inventory and pricing.
 */
export const extractedVariantPayloadSchema = z.object({
  color_code: z.string().nullable().optional(),
  color_name: z.string().nullable().optional(),
  variant_name: z.string().nullable().optional(),
  wash_code: z.string().nullable().optional(),
  finish_override: z.string().nullable().optional(),
  quantity: nonNegativeNumber,
  unit: z.string().nullable().optional(),
  batch_no: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  price: extractedPricePayloadSchema.nullable().optional(),
})

/**
 * Extracted style payload schema.
 *
 * Validates the main fabric style data from AI extraction.
 */
export const extractedStylePayloadSchema = z.object({
  // Primary identification
  item_code: z.string().nullable().optional(),
  name: z.string().nullable().optional(),

  // Categorization
  composition: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  construction: z.string().nullable().optional(),
  finish: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),

  // Physical measurements
  width_cm: positiveNumber,
  width_in: positiveNumber,
  weight_gsm: positiveNumber,
  weight_ozsy: positiveNumber,

  // Season and market info
  season: z.string().nullable().optional(),

  // Optional metadata
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),

  // Variants
  variants: z.array(extractedVariantPayloadSchema).nullable().optional(),
})

/**
 * Fabric extraction metadata schema.
 *
 * Validates metadata from the AI extraction service.
 */
export const fabricExtractionMetadataSchema = z.object({
  extractor_name: z.string(),
  extractor_model: z.string(),
  extractor_version: z.string(),
  confidence_scores: z.record(z.string(), z.number()).optional(),
  extraction_timestamp: z.string().optional(),
})

/**
 * Complete extraction response schema.
 *
 * Validates the full extraction response stored in normalized_payload.
 */
export const fabricExtractionResponseSchema = z.object({
  style: extractedStylePayloadSchema,
  metadata: fabricExtractionMetadataSchema,
})

/**
 * Style review form values schema.
 *
 * Used for validation in the review screen form.
 * All fields are optional strings for flexible form input.
 */
export const styleReviewFormSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  name: z.string().optional(),
  composition: z.string().optional(),
  category: z.string().optional(),
  construction: z.string().optional(),
  finish: z.string().optional(),
  width_cm: stringNumber,
  width_in: stringNumber,
  weight_gsm: stringNumber,
  weight_ozsy: stringNumber,
  pattern: z.string().optional(),
  season: z.string().optional(),
  metadata: z.string().optional(),
  currency: z.string().optional(),
  price: stringNumber,
  price_unit: z.string().optional(),
})

/**
 * Variant review form values schema.
 *
 * Validates individual variant form inputs.
 */
export const variantReviewFormSchema = z.object({
  color_code: z.string().optional(),
  color_name: z.string().optional(),
  variant_name: z.string().optional(),
  wash_code: z.string().optional(),
  finish_override: z.string().optional(),
  quantity: stringNumber,
  unit: z.string().optional(),
  batch_no: z.string().optional(),
  metadata: z.string().optional(),
  // Price fields
  price_currency: z.string().optional(),
  price_value: stringNumber,
  price_unit: z.string().optional(),
  minimum_order_quantity: stringNumber,
  minimum_order_unit: z.string().optional(),
  lead_time_value: stringNumber,
  lead_time_unit: z.string().optional(),
  price_notes: z.string().optional(),
})

/**
 * Complete fabric review form schema.
 *
 * Validates style and all variants together.
 */
export const fabricReviewFormSchema = z.object({
  style: styleReviewFormSchema,
  variants: z.array(variantReviewFormSchema).optional(),
})

/**
 * Reviewed style document schema for commit.
 *
 * Validates the final reviewed style data that will be committed.
 * Nullables are explicit for database compatibility.
 */
export const reviewedStyleDocumentSchema = z.object({
  item_code: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  composition: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  construction: z.string().nullable().optional(),
  finish: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),
  width_cm: z.number().nullable().optional(),
  width_in: z.number().nullable().optional(),
  weight_gsm: z.number().nullable().optional(),
  weight_ozsy: z.number().nullable().optional(),
  season: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

/**
 * Reviewed variant document schema for commit.
 */
export const reviewedVariantDocumentSchema = z.object({
  color_code: z.string().nullable().optional(),
  color_name: z.string().nullable().optional(),
  variant_name: z.string().nullable().optional(),
  wash_code: z.string().nullable().optional(),
  finish_override: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  batch_no: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

/**
 * Reviewed price document schema for commit.
 */
export const reviewedPriceDocumentSchema = z.object({
  currency: z.string().nullable().optional(),
  price: z.number().nullable().optional(),
  price_unit: z.string().nullable().optional(),
  minimum_order_quantity: z.number().nullable().optional(),
  minimum_order_unit: z.string().nullable().optional(),
  lead_time_value: z.number().nullable().optional(),
  lead_time_unit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

/**
 * Complete reviewed fabric document schema.
 *
 * Validates the full payload that will be committed to the database.
 */
export const reviewedFabricDocumentSchema = z.object({
  style: reviewedStyleDocumentSchema,
  variants: z.array(reviewedVariantDocumentSchema).nullable().optional(),
  inventory: z.array(z.object({
    variant_index: z.number(),
    quantity: z.number().nullable().optional(),
    unit: z.string().nullable().optional(),
    batch_no: z.string().nullable().optional(),
  })).nullable().optional(),
  prices: z.array(z.object({
    variant_index: z.number().optional(),
    price: reviewedPriceDocumentSchema,
  })).nullable().optional(),
})

/**
 * Fabric commit payload schema.
 *
 * Validates the complete payload sent to the commit edge function.
 */
export const commitFabricPayloadSchema = z.object({
  scan_session_id: z.string().uuid('Invalid scan session ID'),
  event_id: z.string().uuid('Invalid event ID'),
  vendor_id: z.string().uuid('Invalid vendor ID'),
  reviewed_document: reviewedFabricDocumentSchema,
  source_images: z.array(z.object({
    storage_path: z.string(),
    public_url: z.string().nullable().optional(),
  })).nullable().optional(),
  edit_deltas: z.array(z.object({
    field: z.string(),
    original: z.unknown(),
    modified: z.unknown(),
  })).optional(),
})

/**
 * Commit response schema.
 */
export const commitFabricResponseSchema = z.object({
  style_id: z.string().uuid(),
  variant_ids: z.array(z.string().uuid()).optional(),
  inventory_ids: z.array(z.string().uuid()).optional(),
  price_ids: z.array(z.string().uuid()).optional(),
  fabric_image_ids: z.array(z.string().uuid()).optional(),
  scan_session_id: z.string().uuid(),
})

// Type exports
export type ExtractedPricePayload = z.infer<typeof extractedPricePayloadSchema>
export type ExtractedVariantPayload = z.infer<typeof extractedVariantPayloadSchema>
export type ExtractedStylePayload = z.infer<typeof extractedStylePayloadSchema>
export type FabricExtractionMetadata = z.infer<typeof fabricExtractionMetadataSchema>
export type FabricExtractionResponse = z.infer<typeof fabricExtractionResponseSchema>
export type StyleReviewFormValues = z.infer<typeof styleReviewFormSchema>
export type VariantReviewFormValues = z.infer<typeof variantReviewFormSchema>
export type FabricReviewFormValues = z.infer<typeof fabricReviewFormSchema>
export type ReviewedStyleDocument = z.infer<typeof reviewedStyleDocumentSchema>
export type ReviewedVariantDocument = z.infer<typeof reviewedVariantDocumentSchema>
export type ReviewedPriceDocument = z.infer<typeof reviewedPriceDocumentSchema>
export type ReviewedFabricDocument = z.infer<typeof reviewedFabricDocumentSchema>
export type CommitFabricPayload = z.infer<typeof commitFabricPayloadSchema>
export type CommitFabricResponse = z.infer<typeof commitFabricResponseSchema>
