/**
 * Offline module - drafts, upload queue, and sync state.
 *
 * This module provides local persistence for trade fair capture workflows.
 * All offline logic is isolated here to keep screens and feature APIs clean.
 *
 * Architecture:
 * - constants.ts: Canonical IndexedDB configuration
 * - draftStore.ts: IndexedDB persistence for vendor and style drafts
 * - uploadQueue.ts: Sequential queue for pending uploads and commits
 * - syncEngine.ts: Sequential processor for queue items with retry support
 * - types.ts: Shared types across the offline module
 *
 * Usage:
 * ```ts
 * import { getVendorDraftStore, getStyleDraftStore, getUploadQueue, getSyncEngine } from '@/lib/offline'
 *
 * // Draft operations
 * const draftStore = getVendorDraftStore()
 * await draftStore.save(draft)
 *
 * // Queue operations
 * const queue = getUploadQueue()
 * const queueItemId = await queue.queueVendorSourceUpload(payload)
 *
 * // Sync operations
 * const engine = getSyncEngine()
 * await engine.processItem(queueItemId)
 * await engine.retryItem(queueItemId)
 * ```
 */

// Constants
export { DB_NAME, DB_VERSION, VENDOR_DRAFTS_STORE, STYLE_DRAFTS_STORE, UPLOAD_QUEUE_STORE } from './constants'

// Database utilities
export { initDB, closeDB, deleteDB } from './db'

// Draft stores
export {
  getVendorDraftStore,
  getStyleDraftStore,
  getDraftStore,
  createVendorDraft,
  createStyleDraft,
  generateDraftId,
} from './draftStore'

// Upload queue
export {
  getUploadQueue,
  UploadQueue,
} from './uploadQueue'

// Sync engine
export {
  getSyncEngine,
  createSyncEngine,
  SyncEngine,
  type ProcessResult,
  type QueueItemHandler,
} from './syncEngine'

// Types
export {
  type QueueItem,
  type QueueItemType,
  type QueueItemStatus,
  type QueueStore,
  type VendorSourceUploadPayload,
  type StyleSourceUploadPayload,
  type PendingCommitPayload,
  type VendorSourceUploadItem,
  type StyleSourceUploadItem,
  type PendingCommitItem,
} from './types'

// Re-export draft types for convenience (includes store interfaces)
export type {
  VendorDraft,
  VendorDraftStatus,
  LocalVendorImage,
  ExtractedVendorData,
  VendorDraftStore,
} from '@/features/vendors/types/vendorDraft'
export type {
  StyleDraft,
  StyleDraftStatus,
  LocalStyleImage,
  ExtractedFabricData,
  StyleDraftStore,
} from '@/features/styles/types/styleDraft'
