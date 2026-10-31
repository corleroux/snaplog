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
import { loadSchema } from '../_shared/catalogueSchemaRegistry.ts'
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
}

function validateReviewedDocument(doc: ReviewedCatalogueItemDocument): void {
  requireObject(doc.item, 'item')
  requireNonEmptyString(doc.item.item_code as string | undefined | null, 'item.item_code')
}

/** Read a dotted schema path out of the reviewed item payload. */
function readReviewedPath(item: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.')
  let current: unknown = item
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index)) return undefined
      current = current[index]
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return current
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

    validateUUID(body.scan_session_id, 'scan_session_id')
    validateUUID(body.event_id, 'event_id')
    validateUUID(body.vendor_id, 'vendor_id')
    validateReviewedDocument(body.reviewed_document)

    const verification = await verifyOwnedScanSession<{
      id: string
      event_id: string
      vendor_id: string | null
      item_id: string | null
      schema_type: string | null
      created_by: string
    }>({
      supabase,
      scanSessionId: body.scan_session_id,
      eventId: body.event_id,
      userId: user.id,
      select: 'id, event_id, vendor_id, item_id, schema_type, created_by',
      req,
    })

    if (verification.response) return verification.response
    const scanSession = verification.scanSession!

    if (scanSession.vendor_id !== body.vendor_id) {
      return conflict('vendor_id does not match scan session', req)
    }

    // Validate required fields against the registry schema for this run's
    // catalogue type — never hardcode per-category requirements here.
    if (scanSession.schema_type) {
      try {
        const schema = await loadSchema(scanSession.schema_type)
        const missing = (schema.schema.fields ?? [])
          .filter((f) => f.required)
          .map((f) => f.path)
          .filter((path) => {
            const value = readReviewedPath(body.reviewed_document.item, path)
            return value === null || value === undefined ||
              (typeof value === 'string' && value.trim() === '')
          })
        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(', ')}`)
        }
      } catch (schemaError) {
        // Fail closed on validation errors, but don't mask a missing schema
        // row as a field error — surface it distinctly.
        if (schemaError instanceof Error && schemaError.message.startsWith('Missing required fields')) {
          throw schemaError
        }
        log.warn('Schema validation skipped', { error: schemaError instanceof Error ? schemaError.message : 'Unknown error' })
      }
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

    // Atomic commit: schema provenance is read from scan_sessions by the RPC.
    const { data: commitResult, error: commitError } = await supabaseAdmin
      .rpc('commit_catalogue_item', {
        p_event_id: body.event_id,
        p_vendor_id: body.vendor_id,
        p_scan_session_id: body.scan_session_id,
        p_item_code: itemCode,
        p_name: (body.reviewed_document.item.name as string | undefined)?.trim() || null,
        p_extracted_fields: body.reviewed_document.item,
        p_reviewed_payload: body.reviewed_document,
        p_created_by: user.id,
      })

    if (commitError || !commitResult) {
      log.error('Atomic catalogue item commit failed', { error: commitError?.message || 'Unknown error' })

      if (commitError?.message?.includes('unique constraint') ||
          commitError?.message?.includes('duplicate key') ||
          commitError?.message?.includes('Duplicate item_code')) {
        return conflict(`A catalogue item with item_code "${itemCode}" already exists for this vendor`, req)
      }

      return internalError(commitError?.message || 'Unknown error', 'Failed to create catalogue item', req)
    }

    const typedResult = commitResult as { item_id: string; schema_type: string; schema_version: number }
    const itemId = typedResult.item_id
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
