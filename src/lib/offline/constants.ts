/**
 * Canonical IndexedDB configuration.
 *
 * All offline storage modules MUST use these constants to ensure
 * consistent database access across the application.
 *
 * DB_VERSION should be incremented when schema changes are needed.
 * Both stores (drafts and queue) share the same database but use
 * separate object stores within it.
 */

export const DB_NAME = 'snaplog'
export const DB_VERSION = 5

// Object store names
export const VENDOR_DRAFTS_STORE = 'vendor-drafts'
export const STYLE_DRAFTS_STORE = 'style-drafts'
export const UPLOAD_QUEUE_STORE = 'upload-queue'
