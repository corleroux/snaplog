/**
 * Extraction request schemas.
 *
 * This module defines Zod schemas for extraction request payloads.
 * These schemas enforce the API contract between frontend adapters and backend edge functions.
 *
 * The schemas use snake_case to match Supabase edge function conventions.
 * Internal frontend types use camelCase and are converted at the API boundary.
 *
 * @see extract-vendor-document edge function
 * @see extract-fabric-document edge function
 */

import { z } from 'zod'

/**
 * Scan type enum for vendor document extraction.
 * Matches extract-vendor-document edge function input contract.
 */
export const vendorScanTypeSchema = z.enum([
  'vendor_card',
  'vendor_signage',
  'vendor_brochure',
  'vendor_catalog',
])

/**
 * Scan type enum for fabric document extraction.
 * Matches extract-fabric-document edge function input contract.
 */
export const fabricScanTypeSchema = z.enum([
  'product_tag',
  'stock_sheet',
  'fabric_card',
  'multi_variant_sheet',
])

/**
 * Vendor extraction request schema.
 *
 * Matches extract-vendor-document edge function input contract.
 * Note: storage_path and mime_type are top-level fields, NOT nested in source_image.
 *
 * @example
 * {
 *   scan_session_id: "123e4567-e89b-12d3-a456-426614174000",
 *   event_id: "987fcdeb-51a2-43f1-a456-426614174000",
 *   storage_path: "vendor-documents/abc123.jpg",
 *   mime_type: "image/jpeg",
 *   scan_type: "vendor_card"
 * }
 */
export const extractVendorRequestSchema = z.object({
  scan_session_id: z.string().uuid('Invalid scan session ID'),
  event_id: z.string().uuid('Invalid event ID'),
  storage_path: z.string().min(1, 'Storage path is required'),
  mime_type: z.string().refine(
    (val) => val.startsWith('image/'),
    'MIME type must be an image type'
  ),
  scan_type: vendorScanTypeSchema,
})

/**
 * Fabric extraction request schema.
 *
 * Matches extract-fabric-document edge function input contract.
 * Note: storage_path and mime_type are top-level fields, NOT nested in source_image.
 *
 * @example
 * {
 *   scan_session_id: "123e4567-e89b-12d3-a456-426614174000",
 *   event_id: "987fcdeb-51a2-43f1-a456-426614174000",
 *   vendor_id: "456e7890-e89b-12d3-a456-426614174000",
 *   storage_path: "fabric-documents/xyz789.jpg",
 *   mime_type: "image/jpeg",
 *   scan_type: "product_tag"
 * }
 */
export const extractFabricRequestSchema = z.object({
  scan_session_id: z.string().uuid('Invalid scan session ID'),
  event_id: z.string().uuid('Invalid event ID'),
  vendor_id: z.string().uuid('Invalid vendor ID'),
  storage_path: z.string().min(1, 'Storage path is required'),
  mime_type: z.string().refine(
    (val) => val.startsWith('image/'),
    'MIME type must be an image type'
  ),
  scan_type: fabricScanTypeSchema,
})

// Type exports

export type VendorScanType = z.infer<typeof vendorScanTypeSchema>
export type FabricScanType = z.infer<typeof fabricScanTypeSchema>
export type ExtractVendorRequest = z.infer<typeof extractVendorRequestSchema>
export type ExtractFabricRequest = z.infer<typeof extractFabricRequestSchema>
