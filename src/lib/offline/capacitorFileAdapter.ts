/**
 * Capacitor File Adapter
 *
 * Bridges Capacitor's native filesystem with the web File API.
 * On native platforms, converts Capacitor file URIs to File objects
 * using the Capacitor Filesystem plugin. On web, falls back to
 * fetch-based URI conversion.
 */

import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { createLogger } from '@/lib/logger'

const logger = createLogger('CapacitorFileAdapter')

/**
 * Result of converting a URI to a File object.
 */
export interface UriToFileResult {
  file: File
  mimeType: string
}

/**
 * Check if running on a native Capacitor platform.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Convert a Capacitor file URI to a File object.
 *
 * On native platforms, reads the file using Capacitor Filesystem
 * and converts the result to a web File object.
 *
 * On web, fetches the URI directly (handles blob: URIs, data URIs, etc.)
 *
 * @param uri - The file URI (e.g., from Capacitor Camera)
 * @param name - Desired file name
 * @param type - MIME type hint (falls back to image/jpeg)
 * @returns File object and resolved MIME type
 */
export async function uriToFile(
  uri: string,
  name: string,
  type?: string,
): Promise<UriToFileResult> {
  const mimeType = type || 'image/jpeg'

  if (isNativePlatform()) {
    return uriToFileNative(uri, name, mimeType)
  }

  return uriToFileWeb(uri, name, mimeType)
}

/**
 * Native platform implementation.
 *
 * Uses Capacitor Filesystem to read the file and convert to Blob/File.
 */
async function uriToFileNative(
  uri: string,
  name: string,
  mimeType: string,
): Promise<UriToFileResult> {
  try {
    logger.debug('Reading native file URI', { uri, name })

    let filePath: string
    let directory: Directory = Directory.Documents

    if (uri.startsWith('file://')) {
      filePath = uri.replace('file://', '')
      directory = Directory.ExternalStorage
    } else     if (uri.startsWith('content://')) {
      const result = await Filesystem.readFile({
        path: uri,
        directory: Directory.ExternalStorage,
      })
      return convertToBlob(result.data, name, mimeType)
    } else {
      filePath = uri
    }

    const result = await Filesystem.readFile({
      path: filePath,
      directory,
      encoding: Encoding.UTF8,
    })

    return convertToBlob(result.data, name, mimeType)
  } catch (err) {
    logger.error('Failed to read native file URI', { uri, error: String(err) })
    throw new Error(
      `Failed to read file from native URI: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/**
 * Web platform implementation.
 *
 * Fetches the URI directly using the Fetch API.
 * Handles blob: URIs, data URIs, and http(s) URLs.
 */
async function uriToFileWeb(
  uri: string,
  name: string,
  mimeType: string,
): Promise<UriToFileResult> {
  try {
    logger.debug('Fetching file URI on web', { uri, name })

    const response = await fetch(uri)
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
    }

    const blob = await response.blob()
    const resolvedType = blob.type || mimeType
    const file = new File([blob], name, { type: resolvedType })

    return { file, mimeType: resolvedType }
  } catch (err) {
    logger.error('Failed to fetch file URI on web', { uri, error: String(err) })
    throw new Error(
      `Failed to fetch file from URI: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/**
 * Convert Capacitor Filesystem read result to a Blob, then File.
 */
function convertToBlob(
  data: string | Blob,
  name: string,
  mimeType: string,
): UriToFileResult {
  let blob: Blob

  if (typeof data === 'string') {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    blob = new Blob([bytes], { type: mimeType })
  } else {
    blob = data
  }

  const file = new File([blob], name, { type: blob.type || mimeType })
  return { file, mimeType: blob.type || mimeType }
}

