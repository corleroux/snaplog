/**
 * generate-thumbnails
 *
 * Generates multiple image sizes when images are uploaded to the
 * `scan-originals` bucket. Produces thumbnail (200px) and medium (800px)
 * variants as WebP, preserving the original file.
 *
 * ARCHITECTURE RULES:
 * - MUST authenticate user via requireUser
 * - MUST verify user is a member of the event before processing
 * - MUST download original from storage using admin client
 * - MUST generate thumbnail (200px) and medium (800px) variants
 * - MUST upload variants back to the same bucket
 * - MUST return paths for all sizes
 * - MUST handle missing originals and processing failures gracefully
 *
 * FLOW:
 * authenticate -> validate -> verify membership -> download -> resize -> upload -> respond
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, badRequest, notFound, internalError, forbidden } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { validateUUID, requireNonEmptyString } from '../_shared/validation.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'
import { classifyError } from '../_shared/errorTypes.ts'

initEdgePostHog()

const FUNCTION_NAME = 'generate-thumbnails'
const log = createLogger(FUNCTION_NAME)

const BUCKET_NAME = 'scan-originals'

// Target widths for generated sizes
const THUMB_WIDTH = 200
const MEDIUM_WIDTH = 800

// WebP quality (0-1)
const WEBP_QUALITY = 0.8

// ============================================================================
// TYPES
// ============================================================================

interface GenerateThumbnailsRequest {
  storagePath: string
  eventId: string
}

interface GeneratedPaths {
  original: string
  thumbnail: string
  medium: string
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Resizes image data to a target width using OffscreenCanvas,
 * maintaining aspect ratio, and encodes the result as WebP.
 *
 * Deno Deploy supports createImageBitmap and OffscreenCanvas natively.
 */
async function resizeToWebP(
  imageBlob: Blob,
  targetWidth: number,
): Promise<Blob> {
  // createImageBitmap accepts a Blob directly; Blob.arrayBuffer() creates
  // a copy each call, so the same Blob can be passed to multiple invocations.
  const imageBitmap = await createImageBitmap(imageBlob)

  const aspectRatio = imageBitmap.height / imageBitmap.width
  const targetHeight = Math.round(targetWidth * aspectRatio)

  const canvas = new OffscreenCanvas(targetWidth, targetHeight)
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to get OffscreenCanvas 2D context')
  }

  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight)
  imageBitmap.close()

  const webpBlob = await canvas.convertToBlob({
    type: 'image/webp',
    quality: WEBP_QUALITY,
  })

  return webpBlob
}

/**
 * Derives variant filenames from the original path.
 *
 * Given:  {eventId}/{sessionId}/photo.jpg
 * Thumb:  {eventId}/{sessionId}/photo_thumb.webp
 * Medium: {eventId}/{sessionId}/photo_medium.webp
 */
function getVariantPaths(storagePath: string): { thumbnail: string; medium: string } {
  const lastSlash = storagePath.lastIndexOf('/')
  const directory = storagePath.substring(0, lastSlash)
  const filename = storagePath.substring(lastSlash + 1)

  // Strip existing extension from filename
  const dotIndex = filename.lastIndexOf('.')
  const baseName = dotIndex > 0 ? filename.substring(0, dotIndex) : filename

  return {
    thumbnail: `${directory}/${baseName}_thumb.webp`,
    medium: `${directory}/${baseName}_medium.webp`,
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // ============================================================================
  // RUNTIME GUARDS
  // ============================================================================

  const cors = handleCors(req)
  if (cors) return cors

  const methodError = requireMethod(req, 'POST')
  if (methodError) return methodError

  // ============================================================================
  // AUTHENTICATE
  // ============================================================================

  const auth = await requireUser(req)
  if (auth.response) return auth.response

  const { user } = auth
  const supabaseAdmin = createAdminClient()

  try {
    // ============================================================================
    // PARSE REQUEST
    // ============================================================================

    const body: GenerateThumbnailsRequest = await req.json()

    if (!body.storagePath) {
      return badRequest('storagePath is required', 'Missing storagePath', req)
    }
    if (!body.eventId) {
      return badRequest('eventId is required', 'Missing eventId', req)
    }

    requireNonEmptyString(body.storagePath, 'storagePath')
    validateUUID(body.eventId, 'eventId')

    log.info('Request parsed', { storagePath: body.storagePath, eventId: body.eventId })

    // ============================================================================
    // VERIFY EVENT MEMBERSHIP
    // ============================================================================

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('event_members')
      .select('id')
      .eq('event_id', body.eventId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (membershipError) {
      log.error('Membership lookup failed', { error: membershipError.message })
      return internalError('Failed to verify event membership', 'Membership check failed', req)
    }

    if (!membership) {
      log.warn('User not a member of event', { userId: user.id, eventId: body.eventId })
      return forbidden('You are not a member of this event', req)
    }

    // ============================================================================
    // DOWNLOAD ORIGINAL IMAGE
    // ============================================================================

    log.info('Downloading original', { storagePath: body.storagePath })

    const { data: originalData, error: downloadError } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .download(body.storagePath)

    if (downloadError || !originalData) {
      log.error('Original image not found', { error: downloadError?.message, storagePath: body.storagePath })
      return notFound('Original image not found in storage', 'Image not found', req)
    }

    // ============================================================================
    // GENERATE VARIANTS
    // ============================================================================

    const variantPaths = getVariantPaths(body.storagePath)

    log.info('Generating thumbnail variant', { path: variantPaths.thumbnail, width: THUMB_WIDTH })
    const thumbBlob = await resizeToWebP(originalData, THUMB_WIDTH)

    log.info('Generating medium variant', { path: variantPaths.medium, width: MEDIUM_WIDTH })
    const mediumBlob = await resizeToWebP(originalData, MEDIUM_WIDTH)

    // ============================================================================
    // UPLOAD VARIANTS
    // ============================================================================

    log.info('Uploading thumbnail', { path: variantPaths.thumbnail })
    const { error: thumbUploadError } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .upload(variantPaths.thumbnail, thumbBlob, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (thumbUploadError) {
      log.error('Thumbnail upload failed', { error: thumbUploadError.message, path: variantPaths.thumbnail })
      throw new Error(`Failed to upload thumbnail: ${thumbUploadError.message}`)
    }

    log.info('Uploading medium', { path: variantPaths.medium })
    const { error: mediumUploadError } = await supabaseAdmin
      .storage
      .from(BUCKET_NAME)
      .upload(variantPaths.medium, mediumBlob, {
        contentType: 'image/webp',
        upsert: true,
      })

    if (mediumUploadError) {
      log.error('Medium upload failed', { error: mediumUploadError.message, path: variantPaths.medium })
      throw new Error(`Failed to upload medium: ${mediumUploadError.message}`)
    }

    // ============================================================================
    // RETURN SUCCESS
    // ============================================================================

    const paths: GeneratedPaths = {
      original: body.storagePath,
      thumbnail: variantPaths.thumbnail,
      medium: variantPaths.medium,
    }

    log.info('Thumbnails generated successfully', { paths })

    return json({
      success: true,
      paths,
    }, 200, req)

  } catch (err) {
    // ============================================================================
    // FAILURE RESPONSE
    // ============================================================================

    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const errorType = classifyError(err)
    log.error('Thumbnail generation failed', { error: errorMessage, error_type: errorType })
    captureException(err, { tags: { function: FUNCTION_NAME, error_type: errorType } })

    return internalError(errorMessage, 'Thumbnail generation failed', req)
  }
})
