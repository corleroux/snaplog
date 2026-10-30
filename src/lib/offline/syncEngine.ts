/**
 * Sync engine - Sequential queue processor for offline uploads and commits.
 *
 * This module provides a simple, sequential processor for queue items.
 * It processes one item at a time, dispatches to the correct handler,
 * and updates queue state based on results.
 *
 * Design principles:
 * - Sequential processing (no concurrency complexity)
 * - Explicit state transitions
 * - Clear error handling with retry support
 * - Isolated from UI code
 *
 * Queue item types:
 * - vendor_source_upload: Upload vendor source image to storage
 * - style_source_upload: Upload style source images to storage
 * - pending_commit: Commit reviewed data to database
 */

import type { QueueItem, VendorSourceUploadItem, StyleSourceUploadItem, PendingCommitItem } from './types'
import type { FabricImage } from '@/lib/supabase/types'
import { createLogger } from '@/lib/logger'
import { getUploadQueue } from './uploadQueue'
import { uploadVendorSourceImage, uploadStyleSourceImages } from '@/features/uploads'
import { createScanSession } from '@/features/scans'
import { extractVendorDocument } from '@/features/vendors/api/extractVendorDocument'
import { commitReviewedVendor } from '@/features/vendors/api/commitReviewedVendor'
import type { VendorDraftStatus } from '@/features/vendors/types/vendorDraft'
import { extractFabricDocument } from '@/features/styles/api/extractFabricDocument'
import { commitReviewedFabric } from '@/features/styles/api/commitReviewedFabricDocument'
import type { StyleDraftStatus } from '@/features/styles/types/styleDraft'
import { getDraftStore } from './draftStore'
import { getStyleDraftStore } from './draftStore'
import { uriToFile } from './capacitorFileAdapter'

const logger = createLogger('SyncEngine')

/**
 * Result of processing a queue item.
 */
export type ProcessResult =
  | { success: true; itemId: string }
  | { success: false; itemId: string; error: string }

/**
 * Handler function type for processing a queue item.
 *
 * Each handler is responsible for:
 * - Executing the operation (upload or commit)
 * - Returning success/failure with appropriate error message
 *
 * IMPORTANT: Handlers should NOT create new queue items.
 * The sync engine manages queue state only.
 */
export type QueueItemHandler<T extends QueueItem = QueueItem> = (item: T) => Promise<{
  success: boolean
  error?: string
}>

/**
 * Handler registry maps queue item types to their processing functions.
 */
interface HandlerRegistry {
  vendor_source_upload: QueueItemHandler<VendorSourceUploadItem>
  style_source_upload: QueueItemHandler<StyleSourceUploadItem>
  pending_commit: QueueItemHandler<PendingCommitItem>
}

/**
 * Default handler implementations.
 *
 * These provide stub implementations for upload handlers and
 * actual implementations for commit handlers.
 *
 * Upload handlers are stubs because Capacitor Filesystem integration
 * is not yet wired up - they're marked as TODO for when that layer exists.
 */
const defaultHandlers: HandlerRegistry = {
  /**
   * Vendor source image upload handler.
   *
   * This handler:
   * 1. Uploads the source image to Supabase Storage
   * 2. Creates a scan session
   * 3. Calls the extraction function
   * 4. Updates the draft with scan session and extraction status
   *
   * Note: For offline workflows with Capacitor Filesystem, the file is retrieved
   * from local storage. For now, this requires File objects to be available.
   */
  vendor_source_upload: async (item) => {
    try {
      const payload = item.payload as VendorSourceUploadItem['payload']

      // If File is not available but we have a local URI, try to reconstruct
      if (!payload.file) {
        if (payload.localImageUri) {
          try {
            const name = payload.imageName || `vendor_${item.draftId}.jpg`
            const type = payload.imageType || 'image/jpeg'
            const result = await uriToFile(payload.localImageUri, name, type)
            payload.file = result.file
          } catch (err) {
            logger.error('vendor_source_upload: Failed to read file from local URI', {
              uri: payload.localImageUri,
              error: String(err),
            })
            return {
              success: false,
              error: `Failed to read file from local URI: ${err instanceof Error ? err.message : String(err)}`,
            }
          }
        } else {
          logger.warn('vendor_source_upload: File not available and no localImageUri')
          return {
            success: false,
            error: 'File not available - requires localImageUri or File object',
          }
        }
      }

      // Get scanType from payload or draft
      let scanType = payload.scanType
      if (!scanType) {
        // Try to get scanType from draft
        const draft = await getDraftStore().get(item.draftId ?? '')
        scanType = draft?.scanType ?? 'vendor_card'
      }

      // 1. Upload to Supabase Storage
      const { path: sourceImagePath, signedUrl: sourceImageUrl } =
        await uploadVendorSourceImage({
          eventId: item.eventId ?? '',
          file: payload.file,
          draftId: item.draftId ?? '',
        })

      // 2. Create scan session
      const scanSession = await createScanSession({
        eventId: item.eventId ?? '',
        scanType: scanType as any, // Cast to avoid type issues
        sourceImagePath,
        sourceImageUrl,
      })

      // 3. Call extraction
      await extractVendorDocument({
        scanSessionId: scanSession.id,
        eventId: item.eventId ?? '',
        storagePath: sourceImagePath,
        mimeType: payload.file.type,
        scanType,
      })

      // 4. Update draft - use 'review' status since extraction is complete
      await getDraftStore().update(item.draftId ?? '', {
        sourceImagePath,
        sourceImageUrl,
        scanSessionId: scanSession.id,
        status: 'review' as VendorDraftStatus,
        error: undefined,
      })

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      // Update draft with error
      if (item.draftId) {
        await getDraftStore().update(item.draftId, {
          status: 'failed',
          error: errorMessage,
        })
      }
      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  /**
   * Style source images upload handler.
   *
   * This handler:
   * 1. Uploads the source images to Supabase Storage
   * 2. Creates a scan session
   * 3. Calls the extraction function
   * 4. Updates the draft with scan session and extraction status
   *
   * Note: For offline workflows with Capacitor Filesystem, the files are retrieved
   * from local storage. For now, this requires File objects to be available.
   */
  style_source_upload: async (item) => {
    try {
      const payload = item.payload as StyleSourceUploadItem['payload']

      // If File objects are not available but we have local URIs, try to reconstruct
      if (!payload.files || payload.files.length === 0) {
        if (payload.localImageUris && payload.localImageUris.length > 0) {
          try {
            const files: File[] = []
            for (let i = 0; i < payload.localImageUris.length; i++) {
              const uri = payload.localImageUris[i]
              const name = payload.imageNames?.[i] || `style_${item.draftId}_${i}.jpg`
              const type = payload.imageTypes?.[i] || 'image/jpeg'
              const result = await uriToFile(uri, name, type)
              files.push(result.file)
            }
            payload.files = files
          } catch (err) {
            logger.error('style_source_upload: Failed to read files from local URIs', {
              uris: payload.localImageUris,
              error: String(err),
            })
            return {
              success: false,
              error: `Failed to read files from local URIs: ${err instanceof Error ? err.message : String(err)}`,
            }
          }
        } else {
          logger.warn('style_source_upload: Files not available and no localImageUris')
          return {
            success: false,
            error: 'Files not available - requires localImageUris or File objects',
          }
        }
      }

      // Get scanType from payload or draft
      let scanType = payload.scanType
      if (!scanType) {
        // Try to get scanType from draft
        const draft = await getStyleDraftStore().get(item.draftId ?? '')
        scanType = draft?.scanType ?? 'product_tag'
      }

      // 1. Upload to Supabase Storage
      const { paths: sourceImagePaths, signedUrls: sourceImageUrls } =
        await uploadStyleSourceImages({
          eventId: item.eventId ?? '',
          vendorId: item.vendorId ?? '',
          files: payload.files,
          draftId: item.draftId ?? '',
        })

      // 2. Create scan session (use first image as primary)
      const scanSession = await createScanSession({
        eventId: item.eventId ?? '',
        vendorId: item.vendorId ?? '',
        scanType: scanType as any, // Cast to avoid type issues
        sourceImagePath: sourceImagePaths[0],
        sourceImageUrl: sourceImageUrls[0] || null,
      })

      // 3. Call extraction
      await extractFabricDocument({
        scanSessionId: scanSession.id,
        eventId: item.eventId ?? '',
        vendorId: item.vendorId ?? '',
        storagePath: sourceImagePaths[0],
        mimeType: payload.files[0]?.type || 'image/jpeg',
        scanType,
      })

      // 4. Update draft - use 'review' status since extraction is complete
      await getStyleDraftStore().update(item.draftId ?? '', {
        sourceImagePaths,
        sourceImageUrls,
        scanSessionId: scanSession.id,
        status: 'review' as StyleDraftStatus,
        error: undefined,
      })

      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      // Update draft with error
      if (item.draftId) {
        await getStyleDraftStore().update(item.draftId, {
          status: 'failed',
          error: errorMessage,
        })
      }
      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  /**
   * Pending commit handler - fully implemented.
   *
   * Commits reviewed vendor or fabric data to the database.
   * Distinguishes between vendor and style commits based on payload structure.
   */
  pending_commit: async (item) => {
    const payload = item.payload as PendingCommitItem['payload']

    try {
      const commitData = payload.commitData as any

      if (payload.commitType === 'vendor') {
        await commitReviewedVendor({
          scanSessionId: payload.scanSessionId,
          eventId: item.eventId ?? '',
          reviewedDocument: commitData.reviewed_document ?? commitData.reviewedDocument,
          sourceImagePath: commitData.source_image?.storage_path ?? null,
          sourceImageUrl: commitData.source_image?.public_url ?? null,
        })
        return { success: true }
      }

      if (payload.commitType === 'style') {
        await commitReviewedFabric({
          scanSessionId: payload.scanSessionId,
          eventId: item.eventId ?? '',
          vendorId: item.vendorId ?? '',
          reviewedDocument: commitData.reviewed_document ?? commitData.reviewedDocument,
          sourceImagePaths: commitData.source_images?.map((si: FabricImage) => si.storage_path) ?? null,
          sourceImageUrls: commitData.source_images?.map((si: FabricImage) => si.public_url) ?? null,
        })
        return { success: true }
      }

      return {
        success: false,
        error: `Unknown commitType: ${payload.commitType}`,
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Commit failed',
      }
    }
  },
}


/**
 * Sync engine - processes queue items sequentially.
 *
 * Provides methods for:
 * - Processing a single queue item
 * - Processing all queued items
 * - Retrying a failed item
 * - Getting processing status
 */
export class SyncEngine {
  private queue = getUploadQueue()
  private handlers: HandlerRegistry
  private isProcessing = false
  private currentItemId: string | null = null
  private onlineDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private started = false

  // Bound handlers for proper addEventListener/removeEventListener
  private boundHandleOnline: () => void
  private boundHandleOffline: () => void

  constructor(handlers: Partial<HandlerRegistry> = {}) {
    // Merge provided handlers with defaults
    this.handlers = {
      vendor_source_upload: handlers.vendor_source_upload ?? defaultHandlers.vendor_source_upload,
      style_source_upload: handlers.style_source_upload ?? defaultHandlers.style_source_upload,
      pending_commit: handlers.pending_commit ?? defaultHandlers.pending_commit,
    }

    // Bind handlers once so removeEventListener works correctly
    this.boundHandleOnline = this.handleOnline.bind(this)
    this.boundHandleOffline = this.handleOffline.bind(this)
  }

  /**
   * Process a single queue item by ID.
   *
   * Flow:
   * 1. Fetch item from queue
   * 2. Mark as uploading
   * 3. Dispatch to appropriate handler
   * 4. Mark as synced or failed based on result
   *
   * @param itemId - The queue item ID to process
   * @returns Process result with success status and error if applicable
   */
  async processItem(itemId: string): Promise<ProcessResult> {
    const item = await this.queue.get(itemId)
    if (!item) {
      return {
        success: false,
        itemId,
        error: 'Queue item not found',
      }
    }

    // Don't re-process already synced items
    if (item.status === 'synced') {
      return {
        success: true,
        itemId,
      }
    }

    // Don't process items that are already being processed
    if (item.status === 'uploading') {
      return {
        success: false,
        itemId,
        error: 'Item already being processed',
      }
    }

    try {
      // Mark as uploading
      this.currentItemId = itemId
      this.isProcessing = true
      await this.queue.markUploading(itemId)

      // Dispatch to appropriate handler
      const handler = this.handlers[item.type as keyof HandlerRegistry]
      if (!handler) {
        throw new Error(`No handler registered for queue item type: ${item.type}`)
      }

      const result = await handler(item as any)

      if (result.success) {
        await this.queue.markSynced(itemId)
        return {
          success: true,
          itemId,
        }
      } else {
        await this.queue.markFailed(itemId, result.error || 'Unknown error')
        return {
          success: false,
          itemId,
          error: result.error || 'Unknown error',
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Processing failed'
      await this.queue.markFailed(itemId, error)
      return {
        success: false,
        itemId,
        error,
      }
    } finally {
      this.currentItemId = null
      this.isProcessing = false
    }
  }

  /**
   * Retry a failed queue item.
   *
   * Resets the item to queued status and processes it.
   *
   * @param itemId - The queue item ID to retry
   * @returns Process result with success status and error if applicable
   */
  async retryItem(itemId: string): Promise<ProcessResult> {
    const item = await this.queue.get(itemId)
    if (!item) {
      return {
        success: false,
        itemId,
        error: 'Queue item not found',
      }
    }

    // Only retry failed items
    if (item.status !== 'failed') {
      return {
        success: false,
        itemId,
        error: `Cannot retry item with status: ${item.status}`,
      }
    }

    // Reset to queued and process
    await this.queue.retry(itemId)
    return this.processItem(itemId)
  }

  /**
   * Process all queued items sequentially.
   *
   * Stops at first failure to avoid cascading errors.
   *
   * @returns Results for all processed items
   */
  async processQueued(): Promise<ProcessResult[]> {
    const items = await this.queue.getQueuedItems()

    const results: ProcessResult[] = []
    for (const item of items) {
      const result = await this.processItem(item.id)
      results.push(result)

      // Stop on first failure
      if (!result.success) {
        break
      }
    }

    return results
  }

  /**
   * Process all failed items sequentially (for bulk retry).
   *
   * @returns Results for all processed items
   */
  async retryFailed(): Promise<ProcessResult[]> {
    const items = await this.queue.getFailedItems()

    const results: ProcessResult[] = []
    for (const item of items) {
      const result = await this.retryItem(item.id)
      results.push(result)
    }

    return results
  }

  /**
   * Process all queue items for a specific draft.
   *
   * @param draftId - The draft ID to process items for
   * @returns Results for all processed items
   */
  async processDraftItems(draftId: string): Promise<ProcessResult[]> {
    const items = await this.queue.getItemsForDraft(draftId)

    // Filter to only queued and failed items
    const processableItems = items.filter(
      item => item.status === 'queued' || item.status === 'failed'
    )

    const results: ProcessResult[] = []
    for (const item of processableItems) {
      // Reset failed items before processing
      if (item.status === 'failed') {
        await this.queue.retry(item.id)
      }

      const result = await this.processItem(item.id)
      results.push(result)

      // Stop on first failure
      if (!result.success) {
        break
      }
    }

    return results
  }

  /**
   * Check if the engine is currently processing an item.
   */
  isActive(): boolean {
    return this.isProcessing
  }

  /**
   * Get the ID of the currently processing item.
   */
  getCurrentItemId(): string | null {
    return this.currentItemId
  }

  /**
   * Start listening for online/offline events.
   *
   * When connectivity is restored, the engine waits 5 seconds (debounce)
   * then automatically processes queued items.
   *
   * Safe to call multiple times — listeners are only registered once.
   */
  start(): void {
    if (this.started) return
    this.started = true

    window.addEventListener('online', this.boundHandleOnline)
    window.addEventListener('offline', this.boundHandleOffline)

    logger.info('Started — listening for connectivity changes')
  }

  /**
   * Remove event listeners and clear pending debounce timer.
   *
   * Call this during teardown (e.g. app shutdown or test cleanup).
   */
  destroy(): void {
    if (!this.started) return
    this.started = false

    window.removeEventListener('online', this.boundHandleOnline)
    window.removeEventListener('offline', this.boundHandleOffline)

    if (this.onlineDebounceTimer) {
      clearTimeout(this.onlineDebounceTimer)
      this.onlineDebounceTimer = null
    }

    logger.info('Destroyed — removed connectivity listeners')
  }

  /**
   * Handle the browser 'online' event with a 5-second debounce.
   *
   * The debounce prevents rapid re-triggering when connectivity
   * flaps between online and offline states.
   */
  private async handleOnline(): Promise<void> {
    if (this.onlineDebounceTimer) {
      clearTimeout(this.onlineDebounceTimer)
    }

    this.onlineDebounceTimer = setTimeout(async () => {
      this.onlineDebounceTimer = null
      logger.info('Connectivity restored — processing queued and failed items')
      
      // Process queued items first
      await this.processQueued()

      // Then auto-retry failed items (up to max 3 retries)
      const failedItems = await this.queue.getFailedItems()
      logger.info('Failed items found', { count: failedItems.length })
      const retriableItems = failedItems.filter(item => (item.retryCount ?? 0) < 3)
      logger.info('Retriable items found', { count: retriableItems.length })

      for (const item of retriableItems) {
        logger.info(`Auto-retrying failed item ${item.id}`, { traceId: item.id })
        await this.retryItem(item.id).catch((err) => {
          logger.error(`Auto-retry failed for item ${item.id}`, { error: String(err) })
        })
      }
    }, 5000)
  }

  /**
   * Handle the browser 'offline' event.
   *
   * Cancels any pending online debounce timer to avoid
   * processing during a brief connectivity blip.
   */
  private handleOffline(): void {
    if (this.onlineDebounceTimer) {
      clearTimeout(this.onlineDebounceTimer)
      this.onlineDebounceTimer = null
    }

    logger.info('Connectivity lost — auto-sync paused')
  }
}

// Singleton instance
let syncEngineInstance: SyncEngine | null = null

/**
 * Get the singleton sync engine instance.
 *
 * The engine automatically starts listening for connectivity events
 * on first access. Call destroy() on the instance to tear down listeners.
 */
export function getSyncEngine(): SyncEngine {
  if (!syncEngineInstance) {
    syncEngineInstance = new SyncEngine()
    syncEngineInstance.start()
  }
  return syncEngineInstance
}

/**
 * Create a new sync engine with custom handlers.
 *
 * Use this for testing or when you need to override default handlers.
 */
export function createSyncEngine(handlers: Partial<HandlerRegistry>): SyncEngine {
  return new SyncEngine(handlers)
}
