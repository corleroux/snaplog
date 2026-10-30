/**
 * Storage URL Utilities
 *
 * Constructs permanent public URLs from storage paths for the scan-originals bucket.
 * The bucket has public read RLS, so public URLs never expire — unlike signed URLs
 * which expire after 60 seconds and cause 400 errors on detail pages.
 */

import { env } from '@/config/env'

const STORAGE_BUCKET = 'scan-originals'

/**
 * Convert a storage path to a permanent public URL.
 *
 * @param storagePath - Path within the scan-originals bucket (e.g., "evt-123/capture.webp")
 * @returns Permanent public URL
 */
export function storagePathToPublicUrl(storagePath: string): string {
  const baseUrl = env.VITE_SUPABASE_URL.replace(/\/$/, '')
  return `${baseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${storagePath}`
}

/**
 * Check if a URL is an expired signed URL (contains token= query param).
 *
 * Used by mappers to detect stale `public_url` values that were stored before
 * the fix, and fall back to generating a fresh public URL from `storage_path`.
 */
export function isSignedUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.searchParams.has('token')
  } catch {
    return false
  }
}
