/**
 * Shared types for offline functionality: drafts, upload queue, and sync state.
 *
 * These types support offline-first workflows with explicit persistence and
 * simple state transitions suitable for trade fair capture scenarios.
 */

/**
 * Upload queue item type.
 *
 * Defines what kind of operation is queued for background sync.
 */
export type QueueItemType =
  | 'vendor_source_upload'    // Upload vendor source image to storage
  | 'style_source_upload'     // Upload style source images to storage
  | 'pending_commit'          // Commit reviewed data to database

/**
 * Upload queue item status.
 *
 * States flow: queued -> uploading -> synced (or -> failed on error)
 */
export type QueueItemStatus =
  | 'queued'      // Waiting to process
  | 'uploading'   // Currently processing
  | 'failed'      // Error occurred, may retry
  | 'synced'      // Successfully completed

/**
 * Payload for vendor source upload queue items.
 */
export interface VendorSourceUploadPayload {
  draftId: string
  localImageUri?: string      // Capacitor native URI for the image (used on native platforms)
  imageName?: string
  imageType?: string
  imageSize?: number
  file?: File                 // For online/web uploads (when File is available)
  scanType?: string           // Required for extraction
}

/**
 * Payload for style source upload queue items.
 */
export interface StyleSourceUploadPayload {
  draftId: string
  localImageUris?: string[]   // Capacitor native URIs for images (used on native platforms)
  imageNames?: string[]
  imageTypes?: string[]
  imageSizes?: number[]
  files?: File[]              // For online/web uploads (when Files are available)
  scanType?: string           // Required for extraction
}

/**
 * Payload for pending commit queue items.
 */
export interface PendingCommitPayload {
  scanSessionId: string
  commitType: 'vendor' | 'style'
  commitData: unknown  // Will be typed as VendorCommitData or StyleCommitData by usage
}

/**
 * Upload queue item.
 *
 * Represents a single operation that needs to be synced to the server.
 * Queue items are persisted to IndexedDB for offline reliability.
 */
export interface QueueItem {
  id: string                      // Unique queue item ID
  type: QueueItemType             // What kind of operation
  status: QueueItemStatus         // Current state
  draftId: string | null          // Associated draft ID (if applicable)
  eventId: string | null          // Associated event ID
  vendorId: string | null         // Associated vendor ID (if applicable)
  styleId: string | null          // Associated style ID (if applicable)
  payload: unknown                // Operation-specific data
  retryCount: number              // Number of retry attempts
  lastError: string | null        // Last error message (if failed)
  createdAt: string               // ISO timestamp when queued
  updatedAt: string               // ISO timestamp of last state change
}

/**
 * Queue item with typed payload for vendor source uploads.
 */
export interface VendorSourceUploadItem extends Omit<QueueItem, 'payload'> {
  type: 'vendor_source_upload'
  payload: VendorSourceUploadPayload
}

/**
 * Queue item with typed payload for style source uploads.
 */
export interface StyleSourceUploadItem extends Omit<QueueItem, 'payload'> {
  type: 'style_source_upload'
  payload: StyleSourceUploadPayload
}

/**
 * Queue item with typed payload for pending commits.
 */
export interface PendingCommitItem extends Omit<QueueItem, 'payload'> {
  type: 'pending_commit'
  payload: PendingCommitPayload
}

/**
 * Queue storage operations.
 *
 * Defines the API surface for queue persistence.
 */
export interface QueueStore {
  add(item: Omit<QueueItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>
  get(id: string): Promise<QueueItem | null>
  getAll(): Promise<QueueItem[]>
  getByStatus(status: QueueItemStatus): Promise<QueueItem[]>
  getByDraftId(draftId: string): Promise<QueueItem[]>
  update(id: string, updates: Partial<QueueItem>): Promise<void>
  delete(id: string): Promise<void>
  clearSynced(): Promise<void>
}
