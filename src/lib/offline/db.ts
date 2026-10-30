/**
 * Unified IndexedDB database initialization.
 *
 * All offline storage modules use this single initializer to ensure
 * all object stores are created together, regardless of which module
 * is accessed first.
 *
 * This solves the race condition where separate init functions would
 * only create their own stores, leaving other modules' stores missing.
 */

import { DB_NAME, DB_VERSION, VENDOR_DRAFTS_STORE, STYLE_DRAFTS_STORE, UPLOAD_QUEUE_STORE } from './constants'

let dbInstance: IDBDatabase | null = null

/**
 * Initialize the IndexedDB database with all required object stores.
 *
 * This unified initializer ensures all object stores are created together,
 * preventing the "object store not found" error when modules initialize
 * independently.
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error}`))
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create vendor drafts store if it doesn't exist
      if (!db.objectStoreNames.contains(VENDOR_DRAFTS_STORE)) {
        const store = db.createObjectStore(VENDOR_DRAFTS_STORE, { keyPath: 'id' })
        store.createIndex('eventId', 'eventId', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Create style drafts store if it doesn't exist
      if (!db.objectStoreNames.contains(STYLE_DRAFTS_STORE)) {
        const store = db.createObjectStore(STYLE_DRAFTS_STORE, { keyPath: 'id' })
        store.createIndex('eventId', 'eventId', { unique: false })
        store.createIndex('vendorId', 'vendorId', { unique: false })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }

      // Create upload queue store if it doesn't exist
      if (!db.objectStoreNames.contains(UPLOAD_QUEUE_STORE)) {
        const store = db.createObjectStore(UPLOAD_QUEUE_STORE, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
        store.createIndex('type', 'type', { unique: false })
        store.createIndex('draftId', 'draftId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }
  })
}

/**
 * Close the database connection (useful for testing or cleanup).
 */
export async function closeDB(): Promise<void> {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

/**
 * Delete the entire database (useful for reset/cleanup scenarios).
 *
 * WARNING: This will delete all offline data including drafts and queue items.
 */
export async function deleteDB(): Promise<void> {
  await closeDB()
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(new Error(`Failed to delete database: ${request.error}`))
  })
}
