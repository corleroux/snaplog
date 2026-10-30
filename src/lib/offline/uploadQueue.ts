/**
 * Upload queue for offline-first sync operations.
 *
 * Provides a simple sequential queue for pending uploads and commits
 * that persists across app restarts and connection loss.
 *
 * Queue items flow through states:
 *   queued -> uploading -> synced (or -> failed)
 *
 * Failed items can be retried. Synced items are kept briefly for audit
 * and then cleaned up.
 */

import type {
  QueueItem,
  QueueItemStatus,
  QueueStore,
  VendorSourceUploadPayload,
  StyleSourceUploadPayload,
  PendingCommitPayload,
} from './types'
import { UPLOAD_QUEUE_STORE } from './constants'
import { initDB as unifiedInitDB } from './db'

/**
 * IndexedDB implementation of QueueStore.
 */
class IndexedDBQueueStore implements QueueStore {
  private db: IDBDatabase | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await unifiedInitDB()
    }
    return this.db
  }

  async add(item: Omit<QueueItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = await this.getDB()
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(UPLOAD_QUEUE_STORE)

    const now = new Date().toISOString()
    const id = `queue-${Date.now()}-${crypto.randomUUID()}`

    const queueItem: QueueItem = {
      ...item,
      id,
      createdAt: now,
      updatedAt: now,
    }

    return new Promise((resolve, reject) => {
      const request = store.add(queueItem)

      request.onsuccess = () => resolve(id)
      request.onerror = () => reject(new Error(`Failed to add queue item: ${request.error}`))
    })
  }

  async get(id: string): Promise<QueueItem | null> {
    const db = await this.getDB()
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readonly')
    const store = tx.objectStore(UPLOAD_QUEUE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result ?? null)
      }
      request.onerror = () => reject(new Error(`Failed to get queue item: ${request.error}`))
    })
  }

  async getAll(): Promise<QueueItem[]> {
    const db = await this.getDB()
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readonly')
    const store = tx.objectStore(UPLOAD_QUEUE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result ?? [])
      request.onerror = () => reject(new Error(`Failed to get all queue items: ${request.error}`))
    })
  }

  async getByStatus(status: QueueItemStatus): Promise<QueueItem[]> {
    const db = await this.getDB()
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readonly')
    const store = tx.objectStore(UPLOAD_QUEUE_STORE)
    const index = store.index('status')

    return new Promise((resolve, reject) => {
      const request = index.getAll(status)

      request.onsuccess = () => resolve(request.result ?? [])
      request.onerror = () => reject(new Error(`Failed to get queue items by status: ${request.error}`))
    })
  }

  async getByDraftId(draftId: string): Promise<QueueItem[]> {
    const all = await this.getAll()
    return all.filter(item => item.draftId === draftId)
  }

  async update(id: string, updates: Partial<QueueItem>): Promise<void> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Queue item not found: ${id}`)
    }

    const db = await this.getDB()
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(UPLOAD_QUEUE_STORE)

    const updated: QueueItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
      const request = store.put(updated)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to update queue item: ${request.error}`))
    })
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(UPLOAD_QUEUE_STORE)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to delete queue item: ${request.error}`))
    })
  }

  async clearSynced(): Promise<void> {
    const synced = await this.getByStatus('synced')

    const db = await this.getDB()
    const tx = db.transaction(UPLOAD_QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(UPLOAD_QUEUE_STORE)

    for (const item of synced) {
      store.delete(item.id)
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(new Error(`Failed to clear synced items: ${tx.error}`))
    })
  }
}

// Singleton instance
let queueStoreInstance: QueueStore | null = null

/**
 * Get the singleton queue store instance.
 */
export function getQueueStore(): QueueStore {
  if (!queueStoreInstance) {
    queueStoreInstance = new IndexedDBQueueStore()
  }
  return queueStoreInstance
}

/**
 * Upload queue API surface.
 *
 * Provides a simple, explicit interface for queueing and managing
 * background sync operations.
 */
export class UploadQueue {
  private store: QueueStore

  constructor(store: QueueStore = getQueueStore()) {
    this.store = store
  }

  /**
   * Add a vendor source image upload to the queue.
   */
  async queueVendorSourceUpload(payload: VendorSourceUploadPayload & {
    eventId: string
  }): Promise<string> {
    return this.store.add({
      type: 'vendor_source_upload',
      status: 'queued',
      draftId: payload.draftId,
      eventId: payload.eventId,
      vendorId: null,
      styleId: null,
      payload,
      retryCount: 0,
      lastError: null,
    })
  }

  /**
   * Add a style source images upload to the queue.
   */
  async queueStyleSourceUpload(payload: StyleSourceUploadPayload & {
    eventId: string
    vendorId: string
  }): Promise<string> {
    return this.store.add({
      type: 'style_source_upload',
      status: 'queued',
      draftId: payload.draftId,
      eventId: payload.eventId,
      vendorId: payload.vendorId,
      styleId: null,
      payload,
      retryCount: 0,
      lastError: null,
    })
  }

  /**
   * Add a pending commit operation to the queue.
   */
  async queuePendingCommit(payload: PendingCommitPayload & {
    draftId: string
    eventId: string
    vendorId?: string
    styleId?: string
  }): Promise<string> {
    return this.store.add({
      type: 'pending_commit',
      status: 'queued',
      draftId: payload.draftId,
      eventId: payload.eventId,
      vendorId: payload.vendorId ?? null,
      styleId: payload.styleId ?? null,
      payload,
      retryCount: 0,
      lastError: null,
    })
  }

  /**
   * Get all items in the queue (for sync status display).
   */
  async getAll(): Promise<QueueItem[]> {
    return this.store.getAll()
  }

  /**
   * Get all queued items ready to process.
   */
  async getQueuedItems(): Promise<QueueItem[]> {
    return this.store.getByStatus('queued')
  }

  /**
   * Get a specific queue item by ID.
   */
  async get(id: string): Promise<QueueItem | null> {
    return this.store.get(id)
  }

  /**
   * Get all items associated with a specific draft.
   */
  async getItemsForDraft(draftId: string): Promise<QueueItem[]> {
    return this.store.getByDraftId(draftId)
  }

  /**
   * Get all failed items (for retry UI).
   */
  async getFailedItems(): Promise<QueueItem[]> {
    return this.store.getByStatus('failed')
  }

  /**
   * Get all uploading items (for sync indicator).
   */
  async getUploadingItems(): Promise<QueueItem[]> {
    return this.store.getByStatus('uploading')
  }

  /**
   * Mark an item as currently uploading.
   */
  async markUploading(id: string): Promise<void> {
    await this.store.update(id, { status: 'uploading' })
  }

  /**
   * Mark an item as successfully synced.
   */
  async markSynced(id: string): Promise<void> {
    await this.store.update(id, { status: 'synced' })
  }

  /**
   * Mark an item as failed with an error message.
   */
  async markFailed(id: string, error: string): Promise<void> {
    const item = await this.store.get(id)
    if (!item) return

    await this.store.update(id, {
      status: 'failed',
      lastError: error,
      retryCount: item.retryCount + 1,
    })
  }

  /**
   * Retry a failed item by resetting it to queued.
   */
  async retry(id: string): Promise<void> {
    await this.store.update(id, {
      status: 'queued',
      lastError: null,
    })
  }

  /**
   * Remove a synced item from the queue.
   */
  async remove(id: string): Promise<void> {
    await this.store.delete(id)
  }

  /**
   * Clear all synced items (for cleanup).
   */
  async clearSynced(): Promise<void> {
    await this.store.clearSynced()
  }

  /**
   * Get queue statistics for UI indicators.
   */
  async getStats(): Promise<{
    queued: number
    uploading: number
    failed: number
    synced: number
  }> {
    const [queued, uploading, failed, synced] = await Promise.all([
      this.store.getByStatus('queued'),
      this.store.getByStatus('uploading'),
      this.store.getByStatus('failed'),
      this.store.getByStatus('synced'),
    ])

    return {
      queued: queued.length,
      uploading: uploading.length,
      failed: failed.length,
      synced: synced.length,
    }
  }
}

// Singleton instance
let uploadQueueInstance: UploadQueue | null = null

/**
 * Get the singleton upload queue instance.
 */
export function getUploadQueue(): UploadQueue {
  if (!uploadQueueInstance) {
    uploadQueueInstance = new UploadQueue()
  }
  return uploadQueueInstance
}
