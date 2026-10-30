/**
 * cleanup-orphaned-images
 *
 * Finds and deletes orphaned images in the `scan-originals` bucket.
 * An image is considered orphaned if it is older than 24 hours and
 * not referenced in vendor_images.storage_path or fabric_images.storage_path.
 *
 * SAFETY:
 * - 24-hour grace period before considering an image orphaned
 * - Maximum 100 objects per run (configurable via max_batch_size)
 * - Dry-run mode: ?dry_run=true returns what WOULD be deleted without deleting
 * - All deletions are logged for audit trail
 *
 * AUTH:
 * - Requires authenticated user with owner or admin role in at least one event.
 * - Service-role client is used for storage queries (bypasses RLS for cleanup).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, forbidden, internalError } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

const FUNCTION_NAME = 'cleanup-orphaned-images'
const log = createLogger(FUNCTION_NAME)

const BUCKET_ID = 'scan-originals'
const MAX_BATCH_SIZE = 100

// ============================================================================
// TYPES
// ============================================================================

interface OrphanedObject {
  name: string
  created_at: string
}

interface CleanupResult {
  dry_run: boolean
  scanned: number
  orphans_found: number
  deleted: number
  deletion_errors: number
  orphans: Array<{
    path: string
    created_at: string
    deleted: boolean
    error?: string
  }>
}

// ============================================================================
// AUTHORIZATION
// ============================================================================

async function requireAdminOrOwner(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('event_members')
    .select('role')
    .eq('user_id', userId)
    .in('role', ['owner', 'admin'])
    .limit(1)

  if (error) {
    log.error('Failed to check user role', { error: error.message, userId })
    return false
  }

  return (data?.length ?? 0) > 0
}

// ============================================================================
// ORPHAN DETECTION
// ============================================================================

async function findOrphanedObjects(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  batchSize: number
): Promise<OrphanedObject[]> {
  // Query storage.objects for files in scan-originals older than 24 hours
  // that are NOT referenced in vendor_images or fabric_images.
  //
  // Storage path formats used in this system:
  //   {eventId}/{filename}                 (generic capture)
  //   {eventId}/{vendorId}/{filename}      (vendor-specific capture)
  //   {eventId}/vendor/{draftId}/original.{ext}  (vendor source upload)
  //
  // We match by checking if the full storage.objects.name appears as a
  // suffix in any vendor_images.storage_path or fabric_images.storage_path.
  // This is more reliable than splitting path segments.

  const { data, error } = await supabaseAdmin.rpc('find_orphaned_storage_objects', {
    p_bucket_id: BUCKET_ID,
    p_batch_size: batchSize,
  })

  if (error) {
    // If the RPC doesn't exist yet, fall back to inline query
    log.warn('RPC find_orphaned_storage_objects not available, using inline query', {
      error: error.message,
    })
    return findOrphanedObjectsInline(supabaseAdmin, batchSize)
  }

  return (data ?? []) as OrphanedObject[]
}

async function findOrphanedObjectsInline(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  batchSize: number
): Promise<OrphanedObject[]> {
  // Direct query against storage.objects using the admin client.
  // We list all objects in the bucket older than 24 hours, then filter
  // client-side against vendor_images and fabric_images.

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // List objects older than the grace period
  const { data: objects, error: listError } = await supabaseAdmin
    .storage
    .from(BUCKET_ID)
    .list('', {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'asc' },
    })

  if (listError) {
    log.error('Failed to list storage objects', { error: listError.message })
    throw new Error(`Failed to list storage objects: ${listError.message}`)
  }

  if (!objects || objects.length === 0) {
    return []
  }

  // Filter to objects older than cutoff (folders have null created_at, skip them)
  const oldObjects = objects.filter(
    (obj) => obj.created_at && obj.created_at < cutoff && obj.id
  )

  if (oldObjects.length === 0) {
    return []
  }

  // Build full paths — storage.objects.name for top-level is just the folder
  // name. We need to recursively list into event folders.
  // Since Supabase storage list only returns one level, we query
  // storage.objects directly via REST/API for better coverage.
  // Instead, use the admin client to run a raw SQL query via rpc or
  // use the approach of getting all storage paths from the reference tables.

  // Get all referenced paths from vendor_images
  const { data: vendorPaths, error: vendorError } = await supabaseAdmin
    .from('vendor_images')
    .select('storage_path')

  if (vendorError) {
    log.error('Failed to query vendor_images', { error: vendorError.message })
    throw new Error(`Failed to query vendor_images: ${vendorError.message}`)
  }

  // Get all referenced paths from fabric_images
  const { data: fabricPaths, error: fabricError } = await supabaseAdmin
    .from('fabric_images')
    .select('storage_path')

  if (fabricError) {
    log.error('Failed to query fabric_images', { error: fabricError.message })
    throw new Error(`Failed to query fabric_images: ${fabricError.message}`)
  }

  const referencedPaths = new Set<string>()
  for (const row of vendorPaths ?? []) {
    referencedPaths.add(row.storage_path)
  }
  for (const row of fabricPaths ?? []) {
    referencedPaths.add(row.storage_path)
  }

  // For full orphan detection we need to list recursively into event folders.
  // Build full paths by listing into each event folder.
  const eventFolders = oldObjects.filter((obj) => !obj.name.includes('.'))
  const orphanedObjects: OrphanedObject[] = []

  for (const folder of eventFolders) {
    if (orphanedObjects.length >= batchSize) break

    const { data: folderContents } = await supabaseAdmin
      .storage
      .from(BUCKET_ID)
      .list(folder.name, {
        limit: 500,
        sortBy: { column: 'created_at', order: 'asc' },
      })

    if (!folderContents) continue

    for (const item of folderContents) {
      if (orphanedObjects.length >= batchSize) break

      const fullPath = `${folder.name}/${item.name}`

      // Skip sub-folders (items without extensions)
      if (!item.name.includes('.')) {
        // This could be a vendor folder, list one more level
        const { data: subContents } = await supabaseAdmin
          .storage
          .from(BUCKET_ID)
          .list(fullPath, {
            limit: 200,
            sortBy: { column: 'created_at', order: 'asc' },
          })

        if (!subContents) continue

        for (const subItem of subContents) {
          if (orphanedObjects.length >= batchSize) break
          const subPath = `${fullPath}/${subItem.name}`

          // Skip further sub-folders
          if (!subItem.name.includes('.')) continue

          // Check grace period
          if (!subItem.created_at || subItem.created_at >= cutoff) continue

          // Check if referenced
          if (referencedPaths.has(subPath)) continue

          orphanedObjects.push({
            name: subPath,
            created_at: subItem.created_at,
          })
        }
        continue
      }

      // Check grace period
      if (!item.created_at || item.created_at >= cutoff) continue

      // Check if referenced
      if (referencedPaths.has(fullPath)) continue

      orphanedObjects.push({
        name: fullPath,
        created_at: item.created_at,
      })
    }
  }

  return orphanedObjects.slice(0, batchSize)
}

// ============================================================================
// DELETION
// ============================================================================

async function deleteOrphanedObjects(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  orphans: OrphanedObject[]
): Promise<Array<{ path: string; deleted: boolean; error?: string }>> {
  const results: Array<{ path: string; deleted: boolean; error?: string }> = []

  // Delete in batches of 50 (Supabase storage remove limit)
  const DELETE_BATCH_SIZE = 50

  for (let i = 0; i < orphans.length; i += DELETE_BATCH_SIZE) {
    const batch = orphans.slice(i, i + DELETE_BATCH_SIZE)
    const paths = batch.map((o) => o.name)

    const { error } = await supabaseAdmin
      .storage
      .from(BUCKET_ID)
      .remove(paths)

    if (error) {
      log.error('Batch deletion failed', {
        batch_start: i,
        batch_size: batch.length,
        error: error.message,
      })
      // Mark all in this batch as failed
      for (const orphan of batch) {
        results.push({
          path: orphan.name,
          deleted: false,
          error: error.message,
        })
      }
    } else {
      for (const orphan of batch) {
        results.push({ path: orphan.name, deleted: true })
        log.info('Deleted orphaned image', {
          path: orphan.name,
          created_at: orphan.created_at,
        })
      }
    }
  }

  return results
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // ============================================================================
  // RUNTIME GUARDS
  // ============================================================================

  const cors = handleCors(req)
  if (cors) return cors

  const methodError = requireMethod(req, 'POST')
  if (methodError) return methodError

  // ============================================================================
  // AUTHENTICATE
  // ============================================================================

  const auth = await requireUser(req)
  if (auth.response) return auth.response

  const { user } = auth
  const supabaseAdmin = createAdminClient()

  // ============================================================================
  // AUTHORIZE — must be owner or admin of at least one event
  // ============================================================================

  const isAuthorized = await requireAdminOrOwner(supabaseAdmin, user.id)
  if (!isAuthorized) {
    log.warn('Unauthorized cleanup attempt', { userId: user.id })
    return forbidden('Only owners or admins can run image cleanup', req)
  }

  // ============================================================================
  // PARSE OPTIONS
  // ============================================================================

  const url = new URL(req.url)
  const dryRun = url.searchParams.get('dry_run') === 'true'
  const batchSizeParam = url.searchParams.get('max_batch_size')
  const batchSize = Math.min(
    Math.max(1, parseInt(batchSizeParam ?? String(MAX_BATCH_SIZE), 10) || MAX_BATCH_SIZE),
    MAX_BATCH_SIZE
  )

  log.info('Cleanup started', {
    dry_run: dryRun,
    max_batch_size: batchSize,
    requested_by: user.id,
  })

  try {
    // ============================================================================
    // FIND ORPHANS
    // ============================================================================

    const orphans = await findOrphanedObjects(supabaseAdmin, batchSize)

    log.info('Orphan scan complete', {
      orphans_found: orphans.length,
      dry_run: dryRun,
    })

    // ============================================================================
    // DELETE OR DRY-RUN
    // ============================================================================

    const result: CleanupResult = {
      dry_run: dryRun,
      scanned: -1, // Not easily available from list API
      orphans_found: orphans.length,
      deleted: 0,
      deletion_errors: 0,
      orphans: [],
    }

    if (dryRun) {
      // Dry-run: return what would be deleted without actually deleting
      result.orphans = orphans.map((o) => ({
        path: o.name,
        created_at: o.created_at,
        deleted: false,
      }))
      result.deleted = 0

      log.info('Dry-run complete', { orphans_that_would_be_deleted: orphans.length })
    } else if (orphans.length > 0) {
      // Actually delete
      const deletionResults = await deleteOrphanedObjects(supabaseAdmin, orphans)

      result.orphans = deletionResults
      result.deleted = deletionResults.filter((r) => r.deleted).length
      result.deletion_errors = deletionResults.filter((r) => !r.deleted).length

      log.info('Cleanup complete', {
        deleted: result.deleted,
        errors: result.deletion_errors,
      })
    }

    return json(result, 200, req)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    log.error('Cleanup failed', { error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })
    return internalError(errorMessage, 'Cleanup failed', req)
  }
})
