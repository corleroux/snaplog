/**
 * Catalogue items query for the unified styles screen (FR-CAT-01).
 *
 * Fetches active `catalogue_items` for a vendor and maps them onto style-list
 * records with thumbnails resolved from `scan_sessions` (public
 * `source_image_url`, falling back to a freshly built public URL from
 * `source_image_path` when the stored URL is missing or a stale signed URL).
 *
 * Never throws: an items failure degrades to fabric-only, never blocks the
 * style list.
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'
import { storagePathToPublicUrl, isSignedUrl } from '@/lib/upload/storageUrls'
import { toStyleRecord, type CatalogueDisplayItem, type CatalogueItemRow } from '../api/toStyleRecord'

const logger = createLogger('CatalogueItemsQuery')

export const catalogueItemsKeys = {
  all: ['catalogue-items'] as const,
  byVendor: (vendorId: string) => [...catalogueItemsKeys.all, vendorId] as const,
}

interface ScanThumbnailRow {
  item_id: string | null
  source_image_url: string | null
  source_image_path: string | null
}

export function resolveThumbnailUrl(row: ScanThumbnailRow): string | null {
  if (row.source_image_url && !isSignedUrl(row.source_image_url)) {
    return row.source_image_url
  }
  if (row.source_image_path) {
    return storagePathToPublicUrl(row.source_image_path)
  }
  return null
}

export function useCatalogueItemsQuery(vendorId: string) {
  return useQuery({
    queryKey: catalogueItemsKeys.byVendor(vendorId),
    queryFn: async (): Promise<CatalogueDisplayItem[]> => {
      const { data, error } = await supabase
        .from('catalogue_items')
        .select('id, item_code, name, schema_type, extracted_fields, created_at')
        .eq('vendor_id', vendorId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error || !data) {
        logger.warn('Failed to load catalogue items; showing fabric only', {
          error: error?.message ?? 'No data',
        })
        return []
      }

      const rows = data as CatalogueItemRow[]
      const thumbnails = new Map<string, string>()
      if (rows.length > 0) {
        try {
          const { data: scans, error: scansError } = await supabase
            .from('scan_sessions')
            .select('item_id, source_image_url, source_image_path')
            .in('item_id', rows.map((row) => row.id))

          if (scansError) {
            logger.warn('Failed to load catalogue thumbnails', { error: scansError.message })
          } else {
            for (const scan of (scans ?? []) as ScanThumbnailRow[]) {
              if (!scan.item_id || thumbnails.has(scan.item_id)) {continue}
              const url = resolveThumbnailUrl(scan)
              if (url) {thumbnails.set(scan.item_id, url)}
            }
          }
        } catch (err) {
          logger.warn('Failed to load catalogue thumbnails', { error: String(err) })
        }
      }

      return rows.map((row) => toStyleRecord(row, thumbnails.get(row.id) ?? null, vendorId))
    },
    enabled: !!vendorId,
    staleTime: 2 * 60 * 1000, // 2 minutes — matches the fabric list
  })
}
