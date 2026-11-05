/**
 * Catalogue item extraction adapter (FR-SCH-05).
 *
 * Calls the category-agnostic `extract-catalogue-item` edge function, which
 * loads the schema from the registry and runs the configured provider.
 * Mirrors the vendor/fabric extraction adapters.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('CatalogueItemExtract')

export interface CatalogueItemExtractionResponse {
  item: Record<string, unknown>
  metadata: {
    extractor_name: string
    extractor_model: string
    extractor_version: string
    extraction_timestamp: string
  }
  confidence_scores?: Record<string, number>
}

/**
 * Extract structured fields for any catalogue type from an uploaded image.
 */
export async function extractCatalogueItem(params: {
  scanSessionId: string
  eventId: string
  vendorId: string
  storagePath: string
  mimeType: string
  scanType: string
  catalogueType: string
}): Promise<CatalogueItemExtractionResponse> {
  const { scanSessionId, eventId, vendorId, storagePath, mimeType, scanType, catalogueType } = params

  if (!scanSessionId) {throw new Error('scan_session_id is required')}
  if (!eventId) {throw new Error('event_id is required')}
  if (!vendorId) {throw new Error('vendor_id is required')}
  if (!storagePath) {throw new Error('storage_path is required')}
  if (!catalogueType) {throw new Error('catalogue_type is required')}

  const { data, error } = await supabase.functions.invoke<CatalogueItemExtractionResponse>(
    'extract-catalogue-item',
    {
      body: {
        scan_session_id: scanSessionId,
        event_id: eventId,
        vendor_id: vendorId,
        storage_path: storagePath,
        mime_type: mimeType,
        scan_type: scanType,
        catalogue_type: catalogueType,
      },
    }
  )

  if (error) {
    logger.error('Extract catalogue item function error', { error: String(error) })
    throw new Error(error.message || 'Extraction failed')
  }

  if (!data?.item) {
    throw new Error('No extraction response from catalogue item function')
  }

  return data
}
