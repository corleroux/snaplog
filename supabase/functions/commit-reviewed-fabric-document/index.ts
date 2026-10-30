/**
 * commit-reviewed-fabric-document
 *
 * Validates reviewed textile data and creates final business records.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MUST validate input
 * - MUST authenticate user
 * - MUST verify scan session exists and belongs to authenticated user
 * - MUST ensure event_id and vendor_id match scan session
 * - MUST prevent duplicate commit by checking scan_sessions.style_id
 * - MUST create fabric_styles row
 * - MUST create fabric_variants rows
 * - MUST create inventory_records rows where quantity exists
 * - MUST create price_history rows where price exists
 * - MUST create fabric_images rows where images exist
 * - MUST update scan_sessions with reviewed_payload, reviewed_by, reviewed_at, style_id
 * - MUST NOT perform extraction
 * - MUST NOT overwrite raw_payload or normalized_payload
 *
 * PARTIAL FAILURE POLICY:
 * - If style creation fails: fail the request
 * - If variant/inventory/price/image creation fails: log and continue
 * - Do not roll back created style in this implementation
 *
 * DOMAIN RULE:
 * - Use fabric-specific tables: fabric_styles, fabric_variants, inventory_records, price_history, fabric_images
 * - Do NOT introduce generic products abstraction
 * - Use style_id (NOT fabric_style_id) on scan_sessions
 *
 * COMMIT FLOW SKELETON:
 * parse -> validate -> verify -> idempotency -> create -> finalize -> respond
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

// Validate environment at startup
const env = validateEnv()

const FUNCTION_NAME = 'commit-reviewed-fabric-document'
const log = createLogger(FUNCTION_NAME)
const audit = createCommitAudit(log)

// ============================================================================
// TYPES
// ============================================================================

interface ReviewedStyleDocument {
  item_code?: string | null
  name?: string | null
  composition?: string | null
  category?: string | null
  construction?: string | null
  finish?: string | null
  pattern?: string | null
  width_cm?: number | null
  width_in?: number | null
  weight_gsm?: number | null
  weight_ozsy?: number | null
  season?: string | null
  metadata?: Record<string, unknown> | null
}

interface ReviewedVariantDocument {
  color_code?: string | null
  color_name?: string | null
  variant_name?: string | null
  wash_code?: string | null
  finish_override?: string | null
  quantity?: number | null
  unit?: string | null
  batch_no?: string | null
  metadata?: Record<string, unknown> | null
}

interface ReviewedPriceDocument {
  currency?: string | null
  price?: number | null
  price_unit?: string | null
  minimum_order_quantity?: number | null
  minimum_order_unit?: string | null
  lead_time_value?: number | null
  lead_time_unit?: string | null
  notes?: string | null
}

interface ReviewedInventoryDocument {
  variant_index: number
  quantity?: number | null
  unit?: string | null
  batch_no?: string | null
}

interface ReviewedFabricDocument {
  style: ReviewedStyleDocument
  variants: ReviewedVariantDocument[]
  inventory: ReviewedInventoryDocument[]
  prices: Array<{
    variant_index: number
    price: ReviewedPriceDocument
  }>
}

interface FabricImageReference {
  storage_path: string
  public_url?: string | null
}

interface CommitFabricRequest {
  scan_session_id: string
  event_id: string
  vendor_id: string
  reviewed_document: ReviewedFabricDocument
  source_images?: FabricImageReference[] | null
}

interface CommitFabricResponse {
  style_id: string
  variant_ids: string[]
  inventory_ids: string[]
  price_ids: string[]
  fabric_image_ids: string[]
  scan_session_id: string
  idempotent?: boolean
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateReviewedDocument(doc: ReviewedFabricDocument): void {
  requireObject(doc.style, 'style')
  requireNonEmptyString(doc.style.item_code, 'style.item_code')
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

  const { user, supabase } = auth
  const supabaseAdmin = createAdminClient()

  try {
    // ============================================================================
    // PARSE REQUEST
    // ============================================================================

    const body: CommitFabricRequest = await req.json()
    audit.requestParsed({ scan_session_id: body.scan_session_id, event_id: body.event_id, vendor_id: body.vendor_id })

    // ============================================================================
    // VALIDATE REQUEST
    // ============================================================================

    if (!body.scan_session_id) {
      log.error('Validation failed', { error: 'scan_session_id is required' })
      throw new Error('scan_session_id is required')
    }
    if (!body.event_id) {
      log.error('Validation failed', { error: 'event_id is required' })
      throw new Error('event_id is required')
    }
    if (!body.vendor_id) {
      log.error('Validation failed', { error: 'vendor_id is required' })
      throw new Error('vendor_id is required')
    }
    if (!body.reviewed_document) {
      log.error('Validation failed', { error: 'reviewed_document is required' })
      throw new Error('reviewed_document is required')
    }

    validateUUID(body.scan_session_id, 'scan_session_id')
    validateUUID(body.event_id, 'event_id')
    validateUUID(body.vendor_id, 'vendor_id')
    validateReviewedDocument(body.reviewed_document)

    // ============================================================================
    // VERIFY SCAN SESSION
    // ============================================================================

    const verification = await verifyOwnedScanSession<{
      id: string
      event_id: string
      vendor_id: string | null
      style_id: string | null
      created_by: string
    }>({
      supabase,
      scanSessionId: body.scan_session_id,
      eventId: body.event_id,
      userId: user.id,
      select: 'id, event_id, vendor_id, style_id, created_by',
      req,
    })

    if (verification.response) return verification.response

    const scanSession = verification.scanSession!

    // Verify vendor_id matches (scan session should have vendor_id for fabric scans)
    if (scanSession.vendor_id !== body.vendor_id) {
      return conflict('vendor_id does not match scan session', req)
    }

    // ============================================================================
    // CHECK IDEMPOTENCY
    // ============================================================================

    const idempotency = getExistingCommittedResourceId(scanSession.style_id)
    if (idempotency.alreadyCommitted) {
      audit.replayDetected({ scan_session_id: body.scan_session_id, style_id: idempotency.existingId, idempotent: true })
      return commitSuccessResponse({
        scanSessionId: body.scan_session_id,
        idempotent: true,
        payload: {
          style_id: idempotency.existingId!,
          variant_ids: [],
          inventory_ids: [],
          price_ids: [],
          fabric_image_ids: [],
        },
        req,
      })
    }

    // Check for duplicate item_code for this vendor
    // The fabric_styles table has a unique constraint on (vendor_id, item_code)
    const itemCode = body.reviewed_document.style.item_code!.trim()
    const { data: existingStyle, error: checkError } = await supabase
      .from('fabric_styles')
      .select('id, item_code')
      .eq('vendor_id', body.vendor_id)
      .eq('item_code', itemCode)
      .maybeSingle()

    if (checkError) {
      log.warn('Error checking for duplicate item_code', { error: checkError.message })
      // Continue with insert - let the unique constraint handle it
    } else if (existingStyle) {
      return json(
        {
          error: 'Conflict',
          message: `A fabric style with item_code "${itemCode}" already exists for this vendor`,
          existing_style_id: existingStyle.id,
        },
        409,
        req
      )
    }

    // ============================================================================
    // ATOMIC COMMIT: Create fabric style + finalize scan session in one transaction
    // ============================================================================

    const { data: commitResult, error: commitError } = await supabaseAdmin
      .rpc('commit_fabric_style', {
        p_event_id: body.event_id,
        p_vendor_id: body.vendor_id,
        p_item_code: itemCode,
        p_name: body.reviewed_document.style.name?.trim() || null,
        p_composition: body.reviewed_document.style.composition?.trim() || null,
        p_category: body.reviewed_document.style.category?.trim() || null,
        p_construction: body.reviewed_document.style.construction?.trim() || null,
        p_finish: body.reviewed_document.style.finish?.trim() || null,
        p_pattern: body.reviewed_document.style.pattern?.trim() || null,
        p_width_cm: body.reviewed_document.style.width_cm || null,
        p_width_in: body.reviewed_document.style.width_in || null,
        p_weight_gsm: body.reviewed_document.style.weight_gsm || null,
        p_weight_ozsy: body.reviewed_document.style.weight_ozsy || null,
        p_season: body.reviewed_document.style.season?.trim() || null,
        p_metadata: body.reviewed_document.style.metadata || {},
        p_created_by: user.id,
        p_scan_session_id: body.scan_session_id,
        p_reviewed_payload: body.reviewed_document,
      })

    if (commitError || !commitResult) {
      log.error('Atomic fabric style commit failed', { error: commitError?.message || 'Unknown error' })

      // Check for unique constraint violation (race condition)
      if (commitError?.message?.includes('unique constraint') ||
          commitError?.message?.includes('duplicate key')) {
        return conflict(`A fabric style with item_code "${itemCode}" already exists for this vendor`, req)
      }

      return internalError(commitError?.message || 'Unknown error', 'Failed to create fabric style', req)
    }

    const fabricStyleId = (commitResult as { style_id: string }).style_id
    audit.scanSessionUpdated({ scan_session_id: body.scan_session_id, style_id: fabricStyleId })

    const variantIds: string[] = []
    const inventoryIds: string[] = []
    const priceIds: string[] = []
    const fabricImageIds: string[] = []

    // ============================================================================
    // CREATE OPTIONAL RELATED RECORD(S) (non-fatal — outside transaction)
    // ============================================================================

    // Create fabric_variants
    if (body.reviewed_document.variants && body.reviewed_document.variants.length > 0) {
      for (const variant of body.reviewed_document.variants) {
        const variantResult = await attemptNonFatal(async () => {
          return await supabaseAdmin
            .from('fabric_variants')
            .insert({
              style_id: fabricStyleId,
              event_id: body.event_id,
              vendor_id: body.vendor_id,
              color_code: variant.color_code?.trim() || null,
              color_name: variant.color_name?.trim() || null,
              variant_name: variant.variant_name?.trim() || null,
              wash_code: variant.wash_code?.trim() || null,
              finish_override: variant.finish_override?.trim() || null,
              status: 'active',
              metadata: variant.metadata || {},
              created_by: user.id,
              updated_by: user.id,
            })
            .select('id')
            .single()
        })

        if (variantResult.data) {
          variantIds.push(variantResult.data.id)

          // Create inventory_records if quantity exists
          if (variant.quantity !== null && variant.quantity !== undefined && variant.quantity > 0) {
            const inventoryResult = await attemptNonFatal(async () => {
              return await supabaseAdmin
                .from('inventory_records')
                .insert({
                  variant_id: variantResult.data!.id,
                  style_id: fabricStyleId,
                  event_id: body.event_id,
                  vendor_id: body.vendor_id,
                  quantity: variant.quantity,
                  unit: variant.unit?.trim() || 'pieces',
                  batch_no: variant.batch_no?.trim() || null,
                  stock_status: 'in_stock',
                  created_by: user.id,
                })
                .select('id')
                .single()
            })

            if (inventoryResult.data) {
              inventoryIds.push(inventoryResult.data.id)
            } else if (inventoryResult.error) {
              audit.relatedRecordFailedNonFatal('inventory record', {
                error: inventoryResult.error instanceof Error ? inventoryResult.error.message : String(inventoryResult.error),
              })
            }
          }
        } else if (variantResult.error) {
          audit.relatedRecordFailedNonFatal('fabric variant', {
            error: variantResult.error instanceof Error ? variantResult.error.message : String(variantResult.error),
          })
        }
      }
    }

    // Create inventory_records from inventory array if provided
    if (body.reviewed_document.inventory && body.reviewed_document.inventory.length > 0) {
      for (const inv of body.reviewed_document.inventory) {
        // Find the corresponding variant
        const variantId = variantIds[inv.variant_index]
        if (!variantId) {
          log.warn('No variant found for inventory at index', { variant_index: inv.variant_index })
          continue
        }

        if (inv.quantity !== null && inv.quantity !== undefined && inv.quantity > 0) {
          const inventoryResult = await attemptNonFatal(async () => {
            return await supabaseAdmin
              .from('inventory_records')
              .insert({
                variant_id: variantId,
                style_id: fabricStyleId,
                event_id: body.event_id,
                vendor_id: body.vendor_id,
                quantity: inv.quantity,
                unit: inv.unit?.trim() || 'pieces',
                batch_no: inv.batch_no?.trim() || null,
                stock_status: 'in_stock',
                created_by: user.id,
              })
              .select('id')
              .single()
          })

          if (inventoryResult.data) {
            inventoryIds.push(inventoryResult.data.id)
          } else if (inventoryResult.error) {
            audit.relatedRecordFailedNonFatal('inventory record', {
              error: inventoryResult.error instanceof Error ? inventoryResult.error.message : String(inventoryResult.error),
            })
          }
        }
      }
    }

    // Create price_history records from prices array
    if (body.reviewed_document.prices && body.reviewed_document.prices.length > 0) {
      for (const priceEntry of body.reviewed_document.prices) {
        // Find the corresponding variant
        const variantId = variantIds[priceEntry.variant_index]
        if (!variantId) {
          log.warn('No variant found for price at index', { variant_index: priceEntry.variant_index })
          continue
        }

        const price = priceEntry.price
        if (price.price !== null && price.price !== undefined && price.price > 0) {
          const priceResult = await attemptNonFatal(async () => {
            return await supabaseAdmin
              .from('price_history')
              .insert({
                style_id: null, // Variant-level pricing
                variant_id: variantId,
                event_id: body.event_id,
                vendor_id: body.vendor_id,
                currency: price.currency?.trim() || 'USD',
                price: price.price,
                price_unit: price.price_unit?.trim() || 'piece',
                minimum_order_quantity: price.minimum_order_quantity || null,
                minimum_order_unit: price.minimum_order_unit?.trim() || null,
                lead_time_value: price.lead_time_value || null,
                lead_time_unit: price.lead_time_unit?.trim() || null,
                notes: price.notes?.trim() || null,
                recorded_by: user.id,
              })
              .select('id')
              .single()
          })

          if (priceResult.data) {
            priceIds.push(priceResult.data.id)
          } else if (priceResult.error) {
            audit.relatedRecordFailedNonFatal('price history record', {
              error: priceResult.error instanceof Error ? priceResult.error.message : String(priceResult.error),
            })
          }
        }
      }
    }

    // Create fabric_images records if source images provided
    if (body.source_images && body.source_images.length > 0) {
      for (const imageRef of body.source_images) {
        const imageResult = await attemptNonFatal(async () => {
          return await supabaseAdmin
            .from('fabric_images')
            .insert({
              style_id: fabricStyleId,
              variant_id: null, // Primary images are style-level
              vendor_id: body.vendor_id,
              event_id: body.event_id,
              storage_path: imageRef.storage_path,
              public_url: imageRef.public_url || null,
              image_role: 'scan_original',
              is_primary: fabricImageIds.length === 0, // First image is primary
              created_by: user.id,
            })
            .select('id')
            .single()
        })

        if (imageResult.data) {
          fabricImageIds.push(imageResult.data.id)
        } else if (imageResult.error) {
          audit.relatedRecordFailedNonFatal('fabric image', {
            error: imageResult.error instanceof Error ? imageResult.error.message : String(imageResult.error),
          })
        }
      }
    }

    // ============================================================================
    // RETURN SUCCESS
    // ============================================================================

    audit.completed({ style_id: fabricStyleId, scan_session_id: body.scan_session_id, variant_count: variantIds.length })

    return commitSuccessResponse({
      scanSessionId: body.scan_session_id,
      idempotent: false,
      payload: {
        style_id: fabricStyleId,
        variant_ids: variantIds,
        inventory_ids: inventoryIds,
        price_ids: priceIds,
        fabric_image_ids: fabricImageIds,
      },
      req,
    })

  } catch (err) {
    // ============================================================================
    // FAILURE RESPONSE
    // ============================================================================

    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    audit.failed({ error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })

    return internalError(errorMessage, 'Commit failed', req)
  }
})
