# Offline Module

This module handles all offline-first functionality for the Snaplog system.

## Architecture

The offline module is intentionally isolated to keep queue logic out of screens and feature APIs.

```
src/lib/offline/
├── draftStore.ts         # Draft persistence (IndexedDB)
├── uploadQueue.ts        # Sequential queue for uploads/commits
├── syncEngine.ts         # Queue processor with platform-aware handlers
├── capacitorFileAdapter.ts # Capacitor Filesystem bridge for native platforms
├── types.ts              # Shared types
└── index.ts              # Public API surface
```

## Platform Support

The offline module supports both web and native (Capacitor) platforms:

- **Web**: Uses `fetch()` to convert blob: URIs to File objects
- **Native**: Uses `@capacitor/filesystem` to read native file URIs (`file://`, `content://`) and convert to File objects

The `capacitorFileAdapter.ts` module automatically detects the platform and uses the appropriate method.

## Queue Item Model

Each queue item represents a single sync operation:

```ts
interface QueueItem {
  id: string                    // Unique ID
  type: QueueItemType           // What kind of operation
  status: QueueItemStatus       // Current state
  draftId: string | null        // Associated draft
  eventId: string | null        // Associated event
  vendorId: string | null       // Associated vendor
  styleId: string | null        // Associated style
  payload: unknown              // Operation data
  retryCount: number            // Retry attempts
  lastError: string | null      // Last error
  createdAt: string             // When queued
  updatedAt: string             // Last state change
}
```

## Queue Item Types

- `vendor_source_upload`: Upload vendor source image to storage
- `style_source_upload`: Upload style source images to storage
- `pending_commit`: Commit reviewed data to database

## File Handling by Platform

### Web Platform
- Capture images produce `blob:` URIs
- `fetchFileFromUri()` uses `fetch()` to convert to File objects
- File objects are stored directly in IndexedDB and queue payloads

### Native Platform (iOS/Android via Capacitor)
- Capture images produce `file://` or `content://` URIs
- `capacitorFileAdapter.uriToFile()` uses `@capacitor/filesystem` to read files
- `localImageUri` / `localImageUris` fields store the native URIs in queue payloads
- When syncing, the sync engine reconstructs File objects from these URIs

### Queue Payload Fields
- `localImageUri` (vendor): Native URI for single image
- `localImageUris` (style): Native URIs for multiple images
- `file` / `files`: Web File objects (populated on native during sync)

## State Transitions

```
queued → uploading → synced
        ↘ failed ↗ (retry)
```

- `queued`: Waiting to process
- `uploading`: Currently processing
- `failed`: Error occurred (may retry)
- `synced`: Successfully completed

## Usage

### Queue a vendor source upload

```ts
import { getUploadQueue } from '@/lib/offline'

const queue = getUploadQueue()
const id = await queue.queueVendorSourceUpload({
  draftId: 'draft-123',
  eventId: 'event-456',
  localImageUri: 'file://...',
  imageName: 'business-card.jpg',
  imageType: 'image/jpeg',
  imageSize: 245678,
})
```

### Queue a style source upload

```ts
const id = await queue.queueStyleSourceUpload({
  draftId: 'draft-789',
  eventId: 'event-456',
  vendorId: 'vendor-abc',
  localImageUris: ['file://...'],
  imageNames: ['fabric.jpg'],
  imageTypes: ['image/jpeg'],
  imageSizes: [300000],
})
```

### Queue a pending commit

```ts
const id = await queue.queuePendingCommit({
  draftId: 'draft-123',
  eventId: 'event-456',
  scanSessionId: 'scan-xyz',
  commitData: { /* reviewed data */ },
})
```

### Process queue items

```ts
// Get items ready to process
const queued = await queue.getQueuedItems()

for (const item of queued) {
  await queue.markUploading(item.id)

  try {
    // Perform the upload/commit
    await performOperation(item)

    await queue.markSynced(item.id)
  } catch (error) {
    await queue.markFailed(item.id, String(error))
  }
}
```

### Get queue stats for UI

```ts
const stats = await queue.getStats()
// { queued: 3, uploading: 1, failed: 0, synced: 5 }
```

### Retry failed items

```ts
const failed = await queue.getFailedItems()

for (const item of failed) {
  await queue.retry(item.id)
  // Will be picked up on next processing cycle
}
```

## Design Constraints

- **Sequential**: Items are processed one at a time (no parallel uploads)
- **Explicit**: All state changes are explicit method calls
- **Simple**: No background workers, event systems, or conflict resolution
- **Persistent**: Queue state survives app restarts in IndexedDB
- **Isolated**: Queue logic stays in `lib/offline`, not in screens

## Future Work

Phase E2 provides queue primitives only. Later phases may add:
- Background sync worker
- Automatic retry with exponential backoff
- Network-aware sync triggering

## Relationship to Database Drafts Table

The database has a `public.drafts` table (migration 012) that is **not currently used** by the frontend. This table was created as a future artifact for server-side sync queuing (Phase H).

The two systems serve distinct purposes:

| System | Location | Purpose | Status |
|--------|----------|---------|--------|
| IndexedDB draftStore | `src/lib/offline/draftStore.ts` | Offline capture before sync | Active |
| Database `drafts` table | `public.drafts` (migration 012) | Server-side sync queue | Future (Phase H) |

Do not remove the database `drafts` table — it will be used when server-side draft sync is implemented.
