/**
 * Zod schemas for vendor extraction validation.
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
 * Email validation regex.
 * Supports most common email formats.
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Phone number validation.
 * Allows international formats with optional + prefix.
 */
const phoneRegex = /^\+?[\d\s\-\(\)]+$/

/**
 * Website URL validation.
 * Requires http:// or https:// prefix.
 */
const urlRegex = /^https?:\/\/.+/i

/**
 * Brand names as a comma-separated string or array.
 * Normalized to array in transformation.
 */
const brandNamesSchema = z
  .union([
    z.string().transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean)),
    z.array(z.string()).optional(),
  ])
  .optional()
  .transform((val) => val ?? [])

/**
 * Extracted vendor document schema.
 *
 * Validates the structure of AI-extracted vendor data.
 * This is the minimal explicit schema required for vendor extraction.
 */
export const extractedVendorDocumentSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  booth_number: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  email: z.string().optional().nullable().refine(
    (val) => !val || emailRegex.test(val),
    'Invalid email format'
  ),
  phone: z.string().optional().nullable().refine(
    (val) => !val || phoneRegex.test(val),
    'Invalid phone format'
  ),
  whatsapp: z.string().optional().nullable().refine(
    (val) => !val || phoneRegex.test(val),
    'Invalid WhatsApp format'
  ),
  website_url: z.string().optional().nullable().refine(
    (val) => !val || urlRegex.test(val),
    'Website must start with http:// or https://'
  ),
  address: z.string().optional().nullable(),
  country_of_origin: z.string().optional().nullable(),
  brand_names: brandNamesSchema,
  notes: z.string().optional().nullable(),
})

/**
 * Vendor review form values schema.
 *
 * Used for validation in the review screen form.
 * All fields are strings for form input handling.
 */
export const vendorReviewFormSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  booth_number: z.string().optional(),
  contact_person: z.string().optional(),
  email: z.string().optional().refine(
    (val) => !val || emailRegex.test(val),
    'Invalid email format'
  ),
  phone: z.string().optional().refine(
    (val) => !val || phoneRegex.test(val),
    'Invalid phone format'
  ),
  whatsapp: z.string().optional().refine(
    (val) => !val || phoneRegex.test(val),
    'Invalid WhatsApp format'
  ),
  website_url: z.string().optional().refine(
    (val) => !val || urlRegex.test(val),
    'Website must start with http:// or https://'
  ),
  address: z.string().optional(),
  country_of_origin: z.string().optional(),
  brand_names: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * Extraction metadata schema.
 */
export const extractionMetadataSchema = z.object({
  extractor_name: z.string(),
  extractor_model: z.string(),
  extractor_version: z.string(),
  confidence_scores: z.record(z.string(), z.number()).optional(),
})

/**
 * Complete extraction response schema.
 */
export const vendorExtractionResponseSchema = z.object({
  document: extractedVendorDocumentSchema,
  metadata: extractionMetadataSchema,
})

/**
 * Reviewed vendor document schema for commit.
 *
 * Validates the final reviewed vendor data that will be committed.
 * This is what the user confirms on the review screen.
 */
export const reviewedVendorDocumentSchema = z.object({
  company_name: z.string().min(1, 'Company name is required'),
  booth_number: z.string().nullable().optional(),
  contact_person: z.string().nullable().optional(),
  email: z.string().nullable().optional().refine(
    (val) => !val || emailRegex.test(val),
    'Invalid email format'
  ),
  phone: z.string().nullable().optional().refine(
    (val) => !val || phoneRegex.test(val),
    'Invalid phone format'
  ),
  whatsapp: z.string().nullable().optional().refine(
    (val) => !val || phoneRegex.test(val),
    'Invalid WhatsApp format'
  ),
  website_url: z.string().nullable().optional().refine(
    (val) => !val || urlRegex.test(val),
    'Website must start with http:// or https://'
  ),
  address: z.string().nullable().optional(),
  country_of_origin: z.string().nullable().optional(),
  brand_names: z.array(z.string()).nullable().optional(),
  notes: z.string().nullable().optional(),
})

/**
 * Vendor commit payload schema.
 *
 * Validates the complete payload sent to the commit edge function.
 */
export const commitVendorPayloadSchema = z.object({
  scan_session_id: z.string().uuid('Invalid scan session ID'),
  event_id: z.string().uuid('Invalid event ID'),
  reviewed_document: reviewedVendorDocumentSchema,
  source_image: z.object({
    storage_path: z.string(),
    public_url: z.string().nullable().optional(),
  }).nullable().optional(),
})

/**
 * Commit response schema.
 */
export const commitVendorResponseSchema = z.object({
  vendor_id: z.string().uuid(),
  vendor_image_id: z.string().uuid().nullable().optional(),
  scan_session_id: z.string().uuid(),
})

// Type exports
export type ExtractedVendorDocument = z.infer<typeof extractedVendorDocumentSchema>
export type VendorReviewFormValues = z.infer<typeof vendorReviewFormSchema>
export type ExtractionMetadata = z.infer<typeof extractionMetadataSchema>
export type VendorExtractionResponse = z.infer<typeof vendorExtractionResponseSchema>
export type ReviewedVendorDocument = z.infer<typeof reviewedVendorDocumentSchema>
export type CommitVendorPayload = z.infer<typeof commitVendorPayloadSchema>
export type CommitVendorResponse = z.infer<typeof commitVendorResponseSchema>
