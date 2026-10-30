/**
 * Capture Session Types
 *
 * IMPORTANT: CaptureSession is a TEMPORARY interaction state only.
 * - NOT persistence
 * - NOT extraction
 * - NOT vendor/product
 *
 * It exists solely during the create flow to collect images
 * before the user confirms entity creation.
 */

/**
 * Image classification states within a capture session
 *
 * Gallery: Regular images for browsing, thumbnail selection, reference
 * Info: The single image designated for AI extraction (max 1 per session)
 */
export type ImageClassification = 'gallery' | 'info'

/**
 * A single image within a capture session
 *
 * Note: This is NOT a persisted entity. It only exists in memory
 * during the capture session before user confirms creation.
 */
export interface CaptureImage {
  /** Unique identifier for this image within the session */
  id: string
  /** URI or path to the image (local file system or camera result) */
  uri: string
  /** Classification state - can be changed during session */
  classification: ImageClassification
  /** When the image was added to the session */
  addedAt: Date
  /** Optional caption or note */
  caption?: string
  /** File size in bytes (if available) */
  fileSize?: number
  /** MIME type (if available) */
  mimeType?: string
  /** The path where this image is stored in Supabase storage (if uploaded) */
  storagePath?: string
  /** Permanent public URL (set after upload, used for database persistence) */
  publicUrl?: string
}

/**
 * Entity types that can be created through capture sessions
 */
export type EntityType = 'vendor' | 'fabric_style'

/**
 * Capture session state
 *
 * IMPORTANT: This is NOT a persisted entity. It's temporary in-memory state
 * that exists only during the create flow.
 *
 * Lifecycle:
 * 1. Created when user starts a new capture flow
 * 2. Modified as user adds/removes images and changes classifications
 * 3. Discarded if user cancels
 * 4. Consumed (and then discarded) when user confirms entity creation
 *
 * Rules enforced:
 * - Multiple Gallery images allowed
 * - Maximum ONE Info image at any time
 * - Selecting a new Info image replaces the previous Info assignment
 * - No extraction happens in this session (that's a separate step)
 * - No persistence happens in this session (that's a separate step)
 */
export interface CaptureSession {
  /** Unique session identifier */
  id: string
  /** What type of entity is being created */
  entityType: EntityType
  /** All images in this session */
  images: CaptureImage[]
  /** ID of the image classified as Info (null if none) */
  infoImageId: string | null
  /** When the session was created */
  createdAt: Date
  /** Last time the session was modified */
  updatedAt: Date
}

/**
 * Valid transitions for image classification
 *
 * Gallery → Info: Allowed, but only if no other Info exists (replaces current Info)
 * Info → Gallery: Allowed (demotes current Info to Gallery)
 * Gallery → Gallery: No-op (already Gallery)
 * Info → Info: No-op (already Info)
 */
export type ClassificationTransition =
  | { from: 'gallery'; to: 'info'; requiresNoOtherInfo: true }
  | { from: 'info'; to: 'gallery' }
  | { from: 'gallery'; to: 'gallery' } // no-op
  | { from: 'info'; to: 'info' } // no-op

/**
 * Result of adding an image to a capture session
 */
export interface AddImageResult {
  /** Whether the image was successfully added */
  success: boolean
  /** The updated session (if successful) */
  session?: CaptureSession
  /** Error message (if unsuccessful) */
  error?: string
}

/**
 * Result of removing an image from a capture session
 */
export interface RemoveImageResult {
  /** Whether the image was successfully removed */
  success: boolean
  /** The updated session (if successful) */
  session?: CaptureSession
  /** Error message (if unsuccessful) */
  error?: string
}

/**
 * Result of changing an image's classification
 */
export interface SetClassificationResult {
  /** Whether the classification was successfully changed */
  success: boolean
  /** The updated session (if successful) */
  session?: CaptureSession
  /** Error message (if unsuccessful) */
  error?: string
  /** The ID of the image that was previously Info (if replaced) */
  previousInfoImageId?: string | null
}

/**
 * Capture session lifecycle state
 */
export type SessionLifecycle = 'idle' | 'active' | 'processing' | 'completed' | 'discarded'

/**
 * Capture session state with lifecycle
 */
export interface CaptureSessionState {
  /** Current session (null if no active session) */
  session: CaptureSession | null
  /** Current lifecycle state */
  lifecycle: SessionLifecycle
  /** Error message if something went wrong */
  error?: string
}

/**
 * Validation result for a capture session
 */
export interface SessionValidation {
  /** Whether the session is valid to proceed */
  valid: boolean
  /** Validation errors */
  errors: string[]
  /** Warnings (don't prevent proceeding but值得注意) */
  warnings: string[]
}
