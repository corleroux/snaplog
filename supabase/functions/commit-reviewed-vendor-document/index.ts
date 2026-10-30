/**
 * commit-reviewed-vendor-document
 *
 * Validates reviewed vendor data and creates final vendor records.
 *
 * CANONICAL ARCHITECTURE RULES:
 * - MUST validate input
 * - MUST authenticate user
 * - MUST verify scan session exists and belongs to authenticated user
 * - MUST ensure event_id matches scan session
 * - MUST prevent duplicate commit by checking scan_sessions.vendor_id
 * - MUST create vendor record
 * - MUST create vendor_images record if source image provided
 * - MUST update scan_sessions with reviewed_payload, reviewed_by, reviewed_at, vendor_id
 * - MUST NOT perform extraction
 * - MUST NOT overwrite raw_payload or normalized_payload
 *
 * COMMIT FLOW SKELETON:
 * parse -> validate -> verify -> idempotency -> create -> finalize -> respond
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, internalError } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { validateUUID, requireNonEmptyString } from '../_shared/validation.ts'
import { verifyOwnedScanSession } from '../_shared/scanSessionVerification.ts'
import { getExistingCommittedResourceId } from '../_shared/idempotency.ts'
import { attemptNonFatal } from '../_shared/nonFatal.ts'
import { commitSuccessResponse } from '../_shared/commitResponse.ts'
import { createCommitAudit } from '../_shared/commitAudit.ts'
import { validateEnv } from '../_shared/envValidation.ts'
import { classifyError } from '../_shared/errorTypes.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

// Validate environment at startup
const env = validateEnv()

const FUNCTION_NAME = 'commit-reviewed-vendor-document'
const log = createLogger(FUNCTION_NAME)
const audit = createCommitAudit(log)

// ============================================================================
// TYPES
// ============================================================================

interface CommitVendorRequest {
  scan_session_id: string
  event_id: string
  reviewed_document: {
    company_name: string
    booth_number?: string | null
    contact_person?: string | null
    email?: string | null
    phone?: string | null
    whatsapp?: string | null
    website_url?: string | null
    address?: string | null
    country_of_origin?: string | null
    brand_names?: string[] | null
    notes?: string | null
  }
  source_image?: {
    storage_path: string
    public_url?: string | null
  } | null
}

interface CommitVendorResponse {
  vendor_id: string
  vendor_image_id?: string | null
  scan_session_id: string
  idempotent?: boolean
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateReviewedDocument(doc: CommitVendorRequest['reviewed_document']): void {
  requireNonEmptyString(doc.company_name, 'company_name')
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

    const body: CommitVendorRequest = await req.json()
    audit.requestParsed({ scan_session_id: body.scan_session_id, event_id: body.event_id })

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
    if (!body.reviewed_document) {
      log.error('Validation failed', { error: 'reviewed_document is required' })
      throw new Error('reviewed_document is required')
    }

    validateUUID(body.scan_session_id, 'scan_session_id')
    validateUUID(body.event_id, 'event_id')
    validateReviewedDocument(body.reviewed_document)

    // ============================================================================
    // VERIFY SCAN SESSION
    // ============================================================================

    const verification = await verifyOwnedScanSession<{
      id: string
      event_id: string
      vendor_id: string | null
      created_by: string
    }>({
      supabase,
      scanSessionId: body.scan_session_id,
      eventId: body.event_id,
      userId: user.id,
      select: 'id, event_id, vendor_id, created_by',
      req,
    })

    if (verification.response) return verification.response

    const scanSession = verification.scanSession!

    // ============================================================================
    // CHECK IDEMPOTENCY
    // ============================================================================

    const idempotency = getExistingCommittedResourceId(scanSession.vendor_id)
    if (idempotency.alreadyCommitted) {
      audit.replayDetected({ scan_session_id: body.scan_session_id, vendor_id: idempotency.existingId, idempotent: true })
      return commitSuccessResponse({
        scanSessionId: body.scan_session_id,
        idempotent: true,
        payload: {
          vendor_id: idempotency.existingId!,
          vendor_image_id: null,
        },
        req,
      })
    }

    // ============================================================================
    // ATOMIC COMMIT: Create vendor + finalize scan session in one transaction
    // ============================================================================

    const { data: commitResult, error: commitError } = await supabaseAdmin
      .rpc('commit_vendor', {
        p_event_id: body.event_id,
        p_company_name: body.reviewed_document.company_name.trim(),
        p_booth_number: body.reviewed_document.booth_number?.trim() || null,
        p_contact_person: body.reviewed_document.contact_person?.trim() || null,
        p_email: body.reviewed_document.email?.trim() || null,
        p_phone: body.reviewed_document.phone?.trim() || null,
        p_whatsapp: body.reviewed_document.whatsapp?.trim() || null,
        p_website_url: body.reviewed_document.website_url?.trim() || null,
        p_address: body.reviewed_document.address?.trim() || null,
        p_country_of_origin: body.reviewed_document.country_of_origin?.trim() || null,
        p_brand_names: body.reviewed_document.brand_names || [],
        p_notes: body.reviewed_document.notes?.trim() || null,
        p_created_by: user.id,
        p_scan_session_id: body.scan_session_id,
        p_reviewed_payload: body.reviewed_document,
      })

    if (commitError || !commitResult) {
      log.error('Atomic vendor commit failed', { error: commitError?.message || 'Unknown error' })
      return internalError(commitError?.message || 'Unknown error', 'Failed to create vendor', req)
    }

    const vendorId = (commitResult as { vendor_id: string }).vendor_id
    audit.scanSessionUpdated({ scan_session_id: body.scan_session_id, vendor_id: vendorId })

    let vendorImageId: string | null = null

    // ============================================================================
    // CREATE OPTIONAL RELATED RECORD(S) (non-fatal — outside transaction)
    // ============================================================================

    // Create vendor_images record if source image provided
    if (body.source_image?.storage_path) {
      // Determine image_type from scan_type of the scan session
      const { data: sessionWithType } = await supabase
        .from('scan_sessions')
        .select('scan_type')
        .eq('id', body.scan_session_id)
        .single()

      let imageType: 'business_card' | 'booth_sign' | 'brochure' | 'logo' | 'gallery' = 'gallery'
      const scanType = sessionWithType?.scan_type

      if (scanType === 'vendor_card') imageType = 'business_card'
      else if (scanType === 'vendor_signage') imageType = 'booth_sign'
      else if (scanType === 'vendor_brochure') imageType = 'brochure'

      const imageResult = await attemptNonFatal(async () => {
        return await supabaseAdmin
          .from('vendor_images')
          .insert({
            vendor_id: vendorId,
            event_id: body.event_id,
            storage_path: body.source_image.storage_path,
            public_url: body.source_image.public_url || null,
            image_type: imageType,
            is_primary: true, // First image from scan is primary
            created_by: user.id,
          })
          .select('id')
          .single()
      })

      if (imageResult.data) {
        vendorImageId = imageResult.data.id
        audit.relatedRecordCreated('Vendor image', { vendor_image_id: imageResult.data.id })
      } else if (imageResult.error) {
        audit.relatedRecordFailedNonFatal('vendor_image', {
          error: imageResult.error instanceof Error ? imageResult.error.message : String(imageResult.error),
        })
      }
    }

    // ============================================================================
    // RETURN SUCCESS
    // ============================================================================

    audit.completed({ vendor_id: vendorId, scan_session_id: body.scan_session_id })

    return commitSuccessResponse({
      scanSessionId: body.scan_session_id,
      idempotent: false,
      payload: {
        vendor_id: vendorId,
        vendor_image_id: vendorImageId,
      },
      req,
    })

  } catch (err) {
    // ============================================================================
    // FAILURE RESPONSE
    // ============================================================================

    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const errorType = classifyError(err)
    audit.failed({ error: errorMessage, error_type: errorType })
    captureException(err, { tags: { function: FUNCTION_NAME, error_type: errorType } })

    return internalError(errorMessage, 'Commit failed', req)
  }
})
