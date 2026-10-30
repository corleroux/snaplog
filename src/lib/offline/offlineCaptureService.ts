/**
 * Offline Capture Service
 *
 * Bridges the capture flows with the offline infrastructure.
 * When extraction fails due to network issues, this service:
 * 1. Fetches image blobs from their URIs
 * 2. Saves the capture as a draft in IndexedDB
 * 3. Queues it for sync in the upload queue with the File objects
 * 4. Returns a "saved offline" status so the UI can inform the user
 *
 * The sync engine will automatically process queued items when
 * connectivity is restored.
 */

import { getVendorDraftStore, getStyleDraftStore, generateDraftId } from './draftStore'
import { getUploadQueue } from './uploadQueue'
import { getSyncEngine } from './syncEngine'
import { createLogger } from '@/lib/logger'
import { recordExtractionMetric } from '@/lib/monitoring'
import { uriToFile, isNativePlatform } from './capacitorFileAdapter'
import type { VendorDraft, LocalVendorImage, VendorScanType } from '@/features/vendors/types/vendorDraft'
import type { StyleDraft, LocalStyleImage, FabricScanType } from '@/features/styles/types/styleDraft'
import type { CaptureImage } from '@/types/capture'

const logger = createLogger('OfflineCapture')

// ─── Types ─────────────────────────────────────────────────────

export interface OfflineSaveResult {
  /** The draft ID in IndexedDB */
  draftId: string
  /** Whether the item was queued for sync */
  queuedForSync: boolean
  /** The queue item ID (if queued) */
  queueItemId?: string
}

// ─── Network Detection ─────────────────────────────────────────

/**
 * Check if the browser is currently offline.
 */
export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false
  return !navigator.onLine
}

/**
 * Check if an error is a network/connectivity error.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false
  const message = error instanceof Error ? error.message : String(error)
  const lowerMessage = message.toLowerCase()

  return (
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('networkerror') ||
    lowerMessage.includes('network request failed') ||
    lowerMessage.includes('net::') ||
    lowerMessage.includes('econnrefused') ||
    lowerMessage.includes('enotfound') ||
    lowerMessage.includes('etimedout') ||
    lowerMessage.includes('load failed') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('the user aborted a request')
  )
}

// ─── Blob Fetching ─────────────────────────────────────────────

/**
 * Fetch a File from a capture image URI.
 *
 * On native platforms, uses Capacitor Filesystem to read the file.
 * On web, fetches blob: URIs and converts to File objects.
 */
async function fetchFileFromUri(uri: string, name: string, type: string): Promise<File> {
  if (isNativePlatform()) {
    const result = await uriToFile(uri, name, type || 'image/jpeg')
    return result.file
  }

  const response = await fetch(uri)
  const blob = await response.blob()
  return new File([blob], name, { type: type || blob.type || 'image/jpeg' })
}

/**
 * Convert capture session images to File objects.
 *
 * Returns an array of { file, id, name, type } for each image.
 */
async function captureImagesToFiles(images: CaptureImage[]): Promise<Array<{
  file: File
  id: string
}>> {
  const files: Array<{ file: File; id: string }> = []

  for (const image of images) {
    try {
      const name = `capture_${image.id}.${image.mimeType?.split('/')[1] || 'jpg'}`
      const file = await fetchFileFromUri(
        image.uri,
        name,
        image.mimeType || 'image/jpeg',
      )
      files.push({ file, id: image.id })
    } catch (err) {
      logger.warn('Failed to fetch image blob for offline save', {
        imageId: image.id,
        error: String(err),
      })
    }
  }

  return files
}

// ─── Vendor Offline Save ───────────────────────────────────────

export interface VendorCaptureData {
  eventId: string
  scanType: VendorScanType
  /** Capture images from the session */
  captureImages: CaptureImage[]
  /** The info image ID */
  infoImageId: string
}

/**
 * Save a vendor capture for offline sync.
 *
 * This fetches image blobs, stores the capture data in IndexedDB,
 * and queues it for upload + extraction when connectivity is restored.
 */
export async function saveVendorCaptureOffline(data: VendorCaptureData): Promise<OfflineSaveResult> {
  const { eventId, scanType, captureImages, infoImageId } = data

  // Convert capture images to File objects
  const files = await captureImagesToFiles(captureImages)

  if (files.length === 0) {
    throw new Error('No images available for offline save')
  }

  // Create draft
  const draftId = generateDraftId()
  const localImages: LocalVendorImage[] = captureImages.map(img => ({
    id: img.id,
    uri: img.uri,
    name: `capture_${img.id}.${img.mimeType?.split('/')[1] || 'jpg'}`,
    type: img.mimeType || 'image/jpeg',
    size: img.fileSize || 0,
    capturedAt: img.addedAt.toISOString(),
  }))

  const draft: VendorDraft = {
    id: draftId,
    eventId,
    status: 'draft',
    localImages,
    scanSessionId: null,
    scanType,
    sourceImagePath: null,
    sourceImageUrl: null,
    extractedVendor: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Save draft
  await getVendorDraftStore().save(draft)
  logger.info('Vendor draft saved for offline sync', { draftId, eventId })

  // Find the info image file
  const infoFile = files.find(f => f.id === infoImageId)

  // Queue for sync
  const queueItemId = await getUploadQueue().queueVendorSourceUpload({
    draftId,
    eventId,
    file: infoFile?.file || files[0]?.file,
    scanType,
    imageName: infoFile?.file.name,
    imageType: infoFile?.file.type,
    imageSize: infoFile?.file.size,
  })

  logger.info('Vendor capture queued for sync', { draftId, queueItemId })

  // Record metric
  recordExtractionMetric({
    entityType: 'vendor',
    scanType,
    status: 'offline_queued',
    durationMs: 0,
    traceId: `offline-${draftId}`,
  })

  return {
    draftId,
    queuedForSync: true,
    queueItemId,
  }
}

// ─── Style Offline Save ────────────────────────────────────────

export interface StyleCaptureData {
  eventId: string
  vendorId: string
  scanType: FabricScanType
  /** Capture images from the session */
  captureImages: CaptureImage[]
  /** The info image ID */
  infoImageId: string
}

/**
 * Save a style capture for offline sync.
 *
 * This fetches image blobs, stores the capture data in IndexedDB,
 * and queues it for upload + extraction when connectivity is restored.
 */
export async function saveStyleCaptureOffline(data: StyleCaptureData): Promise<OfflineSaveResult> {
  const { eventId, vendorId, scanType, captureImages } = data

  // Convert capture images to File objects
  const files = await captureImagesToFiles(captureImages)

  if (files.length === 0) {
    throw new Error('No images available for offline save')
  }

  // Create draft
  const draftId = generateDraftId()
  const localImages: LocalStyleImage[] = captureImages.map(img => ({
    id: img.id,
    uri: img.uri,
    name: `capture_${img.id}.${img.mimeType?.split('/')[1] || 'jpg'}`,
    type: img.mimeType || 'image/jpeg',
    size: img.fileSize || 0,
    capturedAt: img.addedAt.toISOString(),
  }))

  const draft: StyleDraft = {
    id: draftId,
    eventId,
    vendorId,
    status: 'draft',
    localImages,
    scanSessionId: null,
    scanType,
    sourceImagePaths: [],
    sourceImageUrls: [],
    extractedFabric: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  // Save draft
  await getStyleDraftStore().save(draft)
  logger.info('Style draft saved for offline sync', { draftId, eventId, vendorId })

  // Queue for sync with all files
  const queueItemId = await getUploadQueue().queueStyleSourceUpload({
    draftId,
    eventId,
    vendorId,
    files: files.map(f => f.file),
    scanType,
  })

  logger.info('Style capture queued for sync', { draftId, queueItemId })

  // Record metric
  recordExtractionMetric({
    entityType: 'fabric',
    scanType,
    status: 'offline_queued',
    durationMs: 0,
    traceId: `offline-${draftId}`,
  })

  return {
    draftId,
    queuedForSync: true,
    queueItemId,
  }
}

// ─── Sync Queue Status ─────────────────────────────────────────

/**
 * Get the current sync queue status.
 */
export async function getSyncStatus(): Promise<{
  queued: number
  uploading: number
  failed: number
  synced: number
}> {
  return getUploadQueue().getStats()
}

/**
 * Trigger manual sync of all queued items.
 */
export async function triggerSync(): Promise<void> {
  const engine = getSyncEngine()
  await engine.processQueued()
}

/**
 * Retry all failed items.
 */
export async function retryFailed(): Promise<void> {
  const engine = getSyncEngine()
  await engine.retryFailed()
}

// ─── Pending Drafts ────────────────────────────────────────────

/**
 * Get all vendor drafts that are pending sync.
 */
export async function getPendingVendorDrafts(): Promise<VendorDraft[]> {
  const all = await getVendorDraftStore().getAll()
  return all.filter(d => d.status === 'draft' || d.status === 'failed')
}

/**
 * Get all style drafts that are pending sync.
 */
export async function getPendingStyleDrafts(): Promise<StyleDraft[]> {
  const all = await getStyleDraftStore().getAll()
  return all.filter(d => d.status === 'draft' || d.status === 'failed')
}
