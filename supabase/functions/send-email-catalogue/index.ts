/**
 * Email Catalogue Edge Function
 *
 * Sends catalogue emails via Resend.
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for sending emails
 * - APP_URL: Base URL for the app (for generating links)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, badRequest, internalError } from '../_shared/http.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { createLogger } from '../_shared/logger.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

const FUNCTION_NAME = 'send-email-catalogue'
const log = createLogger(FUNCTION_NAME)

// ============================================================================
// TYPES
// ============================================================================

interface EmailCatalogueRequest {
  to: string | string[]
  subject: string
  catalogueUrl?: string
  eventId?: string
  vendorId?: string
  styleId?: string
  message?: string
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateEmailRequest(data: unknown): data is EmailCatalogueRequest {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const req = data as Record<string, unknown>

  if (typeof req.to !== 'string' && !Array.isArray(req.to)) {
    return false
  }

  if (typeof req.subject !== 'string') {
    return false
  }

  return true
}

// ============================================================================
// EMAIL TEMPLATE
// ============================================================================

function generateEmailTemplate(
  subject: string,
  message: string | undefined,
  catalogueUrl: string | undefined
): { html: string; text: string } {
  const appUrl = Deno.env.get('APP_URL') || 'https://tradefair-beta.vercel.app'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e293b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .button:hover { background: #2563eb; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #64748b; }
        .message { margin: 20px 0; padding: 15px; background: white; border-left: 4px solid #3b82f6; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Snaplog</h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0;">${subject}</h2>
          ${message ? `<div class="message">${message}</div>` : ''}
          ${catalogueUrl ? `
            <p>You can view the catalogue online by clicking the button below:</p>
            <a href="${catalogueUrl}" class="button">View Catalogue</a>
            <p style="margin-top: 15px; font-size: 12px; color: #64748b;">
              Or copy this link: ${catalogueUrl}
            </p>
          ` : ''}
          <div class="footer">
            <p>This email was sent from the Snaplog system.</p>
            <p>If you have questions, please contact the sender.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Snaplog
====================

${subject}

${message || ''}

${catalogueUrl ? `View the catalogue online: ${catalogueUrl}` : ''}

---
This email was sent from the Snaplog system.
If you have questions, please contact the sender.
  `.trim()

  return { html, text }
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

  // ============================================================================
  // PARSE REQUEST
  // ============================================================================

  let requestBody: EmailCatalogueRequest
  try {
    requestBody = await req.json()
  } catch (err) {
    return badRequest('Invalid JSON')
  }

  if (!validateEmailRequest(requestBody)) {
    return badRequest('Invalid request format. Expected { to: string | string[], subject: string, ... }')
  }

  const { to, subject, catalogueUrl, eventId, vendorId, styleId, message } = requestBody

  log.info('Sending catalogue email', { subject, eventId, vendorId, styleId, requestedBy: user.id })

  // ============================================================================
  // VERIFY RESEND API KEY
  // ============================================================================

  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  if (!resendApiKey) {
    log.error('RESEND_API_KEY not configured')
    return internalError('Email service not configured')
  }

  // ============================================================================
  // GENERATE EMAIL
  // ============================================================================

  const emailTemplate = generateEmailTemplate(subject, message, catalogueUrl)

  // ============================================================================
  // SEND EMAIL via Resend
  // ============================================================================

  try {
    const recipients = Array.isArray(to) ? to : [to]

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Snaplog <noreply@tradefair-beta.vercel.app>',
        to: recipients,
        subject: subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      log.error('Resend API error', { status: resendResponse.status, error: errorText })
      return internalError('Failed to send email via Resend')
    }

    const resendResult = await resendResponse.json()

    log.info('Email sent successfully', {
      to: recipients,
      subject,
      messageId: resendResult.id,
    })

    // ============================================================================
    // AUDIT LOG
    // ============================================================================

    const adminClient = createAdminClient()

    // Determine entity type and ID for audit log
    let entityType: string | null = null
    let entityId: string | null = null

    if (eventId) {
      entityType = 'event'
      entityId = eventId
    } else if (vendorId) {
      entityType = 'vendor'
      entityId = vendorId
    } else if (styleId) {
      entityType = 'fabric_style'
      entityId = styleId
    }

    if (entityType && entityId) {
      await adminClient.from('audit_log').insert({
        entity_type: entityType,
        entity_id: entityId,
        action: 'email_sent',
        old_values: null,
        new_values: {
          to: recipients,
          subject: subject,
          catalogue_url: catalogueUrl || null,
        },
        performed_by: user.id,
      })
    }

    return json({
      success: true,
      messageId: resendResult.id,
      recipients,
    }, 200, req)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    log.error('Send email failed', { error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })
    return internalError(errorMessage, 'Failed to send email', req)
  }
})
