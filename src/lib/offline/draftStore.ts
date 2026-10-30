/**
 * IndexedDB-based draft store for offline vendor and style capture persistence.
 *
 * This provides local storage for drafts before they are synced to the server.
 * Supports interrupted workflows and offline capture scenarios.
 */

import type { VendorDraft, VendorDraftStore } from '@/features/vendors/types/vendorDraft'
import type { StyleDraft, StyleDraftStore } from '@/features/styles/types/styleDraft'
import { VENDOR_DRAFTS_STORE, STYLE_DRAFTS_STORE } from './constants'
import { initDB as unifiedInitDB } from './db'

/**
 * IndexedDB implementation of VendorDraftStore.
 */
class IndexedDBVendorDraftStore implements VendorDraftStore {
  private db: IDBDatabase | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await unifiedInitDB()
    }
    return this.db
  }

  async save(draft: VendorDraft): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction(VENDOR_DRAFTS_STORE, 'readwrite')
    const store = tx.objectStore(VENDOR_DRAFTS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put(draft)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to save draft: ${request.error}`))
    })
  }

  async get(id: string): Promise<VendorDraft | null> {
    const db = await this.getDB()
    const tx = db.transaction(VENDOR_DRAFTS_STORE, 'readonly')
    const store = tx.objectStore(VENDOR_DRAFTS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result ?? null)
      }
      request.onerror = () => reject(new Error(`Failed to get draft: ${request.error}`))
    })
  }

  async getAll(): Promise<VendorDraft[]> {
    const db = await this.getDB()
    const tx = db.transaction(VENDOR_DRAFTS_STORE, 'readonly')
    const store = tx.objectStore(VENDOR_DRAFTS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result ?? [])
      request.onerror = () => reject(new Error(`Failed to get all drafts: ${request.error}`))
    })
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction(VENDOR_DRAFTS_STORE, 'readwrite')
    const store = tx.objectStore(VENDOR_DRAFTS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to delete draft: ${request.error}`))
    })
  }

  async update(id: string, updates: Partial<VendorDraft>): Promise<void> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Draft not found: ${id}`)
    }

    const updated: VendorDraft = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await this.save(updated)
  }
}

/**
 * IndexedDB implementation of StyleDraftStore.
 */
class IndexedDBStyleDraftStore implements StyleDraftStore {
  private db: IDBDatabase | null = null

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) {
      this.db = await unifiedInitDB()
    }
    return this.db
  }

  async save(draft: StyleDraft): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction(STYLE_DRAFTS_STORE, 'readwrite')
    const store = tx.objectStore(STYLE_DRAFTS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.put(draft)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to save draft: ${request.error}`))
    })
  }

  async get(id: string): Promise<StyleDraft | null> {
    const db = await this.getDB()
    const tx = db.transaction(STYLE_DRAFTS_STORE, 'readonly')
    const store = tx.objectStore(STYLE_DRAFTS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result ?? null)
      }
      request.onerror = () => reject(new Error(`Failed to get draft: ${request.error}`))
    })
  }

  async getAll(): Promise<StyleDraft[]> {
    const db = await this.getDB()
    const tx = db.transaction(STYLE_DRAFTS_STORE, 'readonly')
    const store = tx.objectStore(STYLE_DRAFTS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result ?? [])
      request.onerror = () => reject(new Error(`Failed to get all drafts: ${request.error}`))
    })
  }

  async delete(id: string): Promise<void> {
    const db = await this.getDB()
    const tx = db.transaction(STYLE_DRAFTS_STORE, 'readwrite')
    const store = tx.objectStore(STYLE_DRAFTS_STORE)

    return new Promise((resolve, reject) => {
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(new Error(`Failed to delete draft: ${request.error}`))
    })
  }

  async update(id: string, updates: Partial<StyleDraft>): Promise<void> {
    const existing = await this.get(id)
    if (!existing) {
      throw new Error(`Draft not found: ${id}`)
    }

    const updated: StyleDraft = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    await this.save(updated)
  }
}

// Singleton instances
let vendorDraftStoreInstance: VendorDraftStore | null = null
let styleDraftStoreInstance: StyleDraftStore | null = null

/**
 * Get the singleton vendor draft store instance.
 */
export function getVendorDraftStore(): VendorDraftStore {
  if (!vendorDraftStoreInstance) {
    vendorDraftStoreInstance = new IndexedDBVendorDraftStore()
  }
  return vendorDraftStoreInstance
}

/**
 * Get the singleton style draft store instance.
 */
export function getStyleDraftStore(): StyleDraftStore {
  if (!styleDraftStoreInstance) {
    styleDraftStoreInstance = new IndexedDBStyleDraftStore()
  }
  return styleDraftStoreInstance
}

/**
 * Get the vendor draft store (legacy alias for backward compatibility).
 * @deprecated Use getVendorDraftStore instead.
 */
export function getDraftStore(): VendorDraftStore {
  return getVendorDraftStore()
}

/**
 * Helper to create a new vendor draft with initial values.
 */
export function createVendorDraft(
  eventId: string,
  scanType: VendorDraft['scanType'] = 'vendor_card'
): Omit<VendorDraft, 'id'> {
  return {
    eventId,
    status: 'draft',
    localImages: [],
    scanSessionId: null,
    scanType,
    sourceImagePath: null,
    sourceImageUrl: null,
    extractedVendor: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Helper to create a new style draft with initial values.
 */
export function createStyleDraft(
  eventId: string,
  vendorId: string,
  scanType: StyleDraft['scanType'] = 'product_tag'
): Omit<StyleDraft, 'id'> {
  return {
    eventId,
    vendorId,
    status: 'draft',
    localImages: [],
    scanSessionId: null,
    scanType,
    sourceImagePaths: [],
    sourceImageUrls: [],
    extractedFabric: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Helper to generate a unique draft ID.
 */
export function generateDraftId(): string {
  return `draft-${Date.now()}-${crypto.randomUUID()}`
}

// Re-export queue types and functions for convenience
export * from './types'
export { getUploadQueue, type UploadQueue } from './uploadQueue'
