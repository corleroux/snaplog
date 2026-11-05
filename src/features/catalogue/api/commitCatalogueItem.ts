/**
 * Catalogue item commit adapter (FR-SCH-05).
 *
 * Commits a reviewed catalogue item via `commit-reviewed-catalogue-item`.
 * Sends only the reviewed document — the edge function stamps
 * schema_type/schema_version from the extraction run, never from the client.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('CatalogueItemCommit')

export interface CommitCatalogueItemResponse {
  item_id: string
  variant_ids: string[]
  scan_session_id: string
  idempotent?: boolean
}

/**
 * Commit a reviewed catalogue item.
 */
export async function commitCatalogueItem(params: {
  scanSessionId: string
  eventId: string
  vendorId: string
  reviewedDocument: { item: Record<string, unknown>; colourways?: Array<Record<string, unknown>> | null }
}): Promise<CommitCatalogueItemResponse> {
  const { scanSessionId, eventId, vendorId, reviewedDocument } = params

  if (!scanSessionId) {throw new Error('scan_session_id is required')}
  if (!eventId) {throw new Error('event_id is required')}
  if (!vendorId) {throw new Error('vendor_id is required')}
  if (!reviewedDocument?.item) {throw new Error('reviewed_document.item is required')}

  const { data, error } = await supabase.functions.invoke<CommitCatalogueItemResponse>(
    'commit-reviewed-catalogue-item',
    {
      body: {
        scan_session_id: scanSessionId,
        event_id: eventId,
        vendor_id: vendorId,
        reviewed_document: reviewedDocument,
      },
    }
  )

  if (error) {
    logger.error('Commit catalogue item function error', { error: String(error) })
    throw new Error(error.message || 'Commit failed')
  }

  if (!data?.item_id) {
    throw new Error('No item id returned from catalogue item commit')
  }

  return data
}
