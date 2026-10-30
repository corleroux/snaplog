/**
 * commit-reviewed-catalogue-item
 *
 * Validates reviewed data for any catalogue item and creates the final records.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MUST validate input
 * - MUST authenticate user
 * - MUST verify scan session exists and belongs to authenticated user
 * - MUST ensure event_id and vendor_id match scan session
 * - MUST prevent duplicate commit by checking scan_sessions.item_id
 * - MUST create catalogue_items row
 * - MUST create catalogue_item_variants rows
 * - MUST update scan_sessions with reviewed_payload, reviewed_by, reviewed_at, item_id
 * - MUST NOT perform extraction
 * - MUST NOT overwrite raw_payload or normalized_payload
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, conflict, internalError } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { validateUUID, requireObject, requireNonEmptyString } from '../_shared/validation.ts'
import { verifyOwnedScanSession } from '../_shared/scanSessionVerification.ts'
import { getExistingCommittedResourceId } from '../_shared/idempotency.ts'
import { attemptNonFatal } from '../_shared/nonFatal.ts'
import { commitSuccessResponse } from '../_shared/commitResponse.ts'
import { createCommitAudit } from '../_shared/commitAudit.ts'
import { validateEnv } from '../_shared/envValidation.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

const env = validateEnv()

const FUNCTION_NAME = 'commit-reviewed-catalogue-item'
const log = createLogger(FUNCTION_NAME)
const audit = createCommitAudit(log)

interface ReviewedCatalogueItemDocument {
  item: Record<string, unknown>
  colourways?: Array<Record<string, unknown>> | null
}

interface CommitCatalogueItemRequest {
  scan_session_id: string
  event_id: string
  vendor_id: string
  reviewed_document: ReviewedCatalogueItemDocument
  schema_type: string
  schema_version: number
  source_images?: Array<{ storage_path: string; public_url?: string | null }> | null
}

function validateReviewedDocument(doc: ReviewedCatalogueItemDocument): void {
  requireObject(doc.item, 'item')
  requireNonEmptyString(doc.item.item_code as string | undefined | null, 'item.item_code')
}

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const methodError = requireMethod(req, 'POST')
  if (methodError) return methodError

  const auth = await requireUser(req)
  if (auth.response) return auth.response

  const { user, supabase } = auth
  const supabaseAdmin = createAdminClient()

  try {
    const body: CommitCatalogueItemRequest = await req.json()
    audit.requestParsed({ scan_session_id: body.scan_session_id, event_id: body.event_id, vendor_id: body.vendor_id })

    if (!body.scan_session_id) throw new Error('scan_session_id is required')
    if (!body.event_id) throw new Error('event_id is required')
    if (!body.vendor_id) throw new Error('vendor_id is required')
    if (!body.reviewed_document) throw new Error('reviewed_document is required')
    if (!body.schema_type) throw new Error('schema_type is required')
    if (typeof body.schema_version !== 'number') throw new Error('schema_version is required')

    validateUUID(body.scan_session_id, 'scan_session_id')
    validateUUID(body.event_id, 'event_id')
    validateUUID(body.vendor_id, 'vendor_id')
    validateReviewedDocument(body.reviewed_document)

    const verification = await verifyOwnedScanSession<{
      id: string
      event_id: string
      vendor_id: string | null
      item_id: string | null
      created_by: string
    }>({
      supabase,
      scanSessionId: body.scan_session_id,
      eventId: body.event_id,
      userId: user.id,
      select: 'id, event_id, vendor_id, item_id, created_by',
      req,
    })

    if (verification.response) return verification.response
    const scanSession = verification.scanSession!

    if (scanSession.vendor_id !== body.vendor_id) {
      return conflict('vendor_id does not match scan session', req)
    }

    const idempotency = getExistingCommittedResourceId(scanSession.item_id)
    if (idempotency.alreadyCommitted) {
      audit.replayDetected({ scan_session_id: body.scan_session_id, item_id: idempotency.existingId, idempotent: true })
      return commitSuccessResponse({
        scanSessionId: body.scan_session_id,
        idempotent: true,
        payload: { item_id: idempotency.existingId!, variant_ids: [] },
        req,
      })
    }

    const itemCode = String(body.reviewed_document.item.item_code).trim()

    const { data: existingItem, error: checkError } = await supabase
      .from('catalogue_items')
      .select('id, item_code')
      .eq('vendor_id', body.vendor_id)
      .eq('item_code', itemCode)
      .maybeSingle()

    if (checkError) {
      log.warn('Error checking for duplicate item_code', { error: checkError.message })
    } else if (existingItem) {
      return json(
        {
          error: 'Conflict',
          message: `A catalogue item with item_code "${itemCode}" already exists for this vendor`,
          existing_item_id: existingItem.id,
        },
        409,
        req
      )
    }

    const { data: itemData, error: itemError } = await supabaseAdmin
      .from('catalogue_items')
      .insert({
        event_id: body.event_id,
        vendor_id: body.vendor_id,
        schema_type: body.schema_type,
        schema_version: body.schema_version,
        item_code: itemCode,
        name: (body.reviewed_document.item.name as string | undefined)?.trim() || null,
        extracted_fields: body.reviewed_document.item,
        status: 'active',
        created_by: user.id,
        updated_by: user.id,
      })
      .select('id')
      .single()

    if (itemError || !itemData) {
      if (itemError?.message?.includes('unique constraint') || itemError?.message?.includes('duplicate key')) {
        return conflict(`A catalogue item with item_code "${itemCode}" already exists for this vendor`, req)
      }
      log.error('Failed to create catalogue item', { error: itemError?.message || 'Unknown error' })
      return internalError(itemError?.message || 'Unknown error', 'Failed to create catalogue item', req)
    }

    const itemId = itemData.id
    audit.scanSessionUpdated({ scan_session_id: body.scan_session_id, item_id: itemId })

    const variantIds: string[] = []

    if (body.reviewed_document.colourways && body.reviewed_document.colourways.length > 0) {
      for (const colourway of body.reviewed_document.colourways) {
        const variantResult = await attemptNonFatal(async () => {
          return await supabaseAdmin
            .from('catalogue_item_variants')
            .insert({
              item_id: itemId,
              event_id: body.event_id,
              vendor_id: body.vendor_id,
              variant_name: (colourway.variant_name as string | undefined)?.trim() || null,
              colour_code: (colourway.colour_code as string | undefined)?.trim() || null,
              colour_name: (colourway.colour_name as string | undefined)?.trim() || null,
              sizing: (colourway.sizing as string | undefined)?.trim() || null,
              status: 'active',
              extracted_fields: colourway,
              created_by: user.id,
              updated_by: user.id,
            })
            .select('id')
            .single()
        })

        if (variantResult.data) {
          variantIds.push(variantResult.data.id)
        } else if (variantResult.error) {
          audit.relatedRecordFailedNonFatal('catalogue item variant', {
            error: variantResult.error instanceof Error ? variantResult.error.message : String(variantResult.error),
          })
        }
      }
    }

    // Finalize scan session with reviewed payload and item_id.
    const { error: finalizeError } = await supabaseAdmin
      .from('scan_sessions')
      .update({
        reviewed_payload: body.reviewed_document,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        item_id: itemId,
      })
      .eq('id', body.scan_session_id)

    if (finalizeError) {
      log.error('Failed to finalize scan session', { error: finalizeError.message })
    }

    audit.completed({ item_id: itemId, scan_session_id: body.scan_session_id, variant_count: variantIds.length })

    return commitSuccessResponse({
      scanSessionId: body.scan_session_id,
      idempotent: false,
      payload: { item_id: itemId, variant_ids: variantIds },
      req,
    })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    audit.failed({ error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })
    return internalError(errorMessage, 'Commit failed', req)
  }
})
