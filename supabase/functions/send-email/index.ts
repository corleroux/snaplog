/**
 * Send Email Edge Function
 *
 * General email service for sending transactional and notification emails.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors, requireMethod, json } from '../_shared/http.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { createLogger } from '../_shared/logger.ts'
import { escapeHtml } from '../_shared/escapeHtml.ts'

const log = createLogger('send-email')

interface EmailRequest {
  to: string | string[]
  subject: string
  template?: 'notification' | 'alert' | 'invitation' | 'custom'
  templateData?: Record<string, unknown>
  html?: string
  text?: string
}

/**
 * Validate email request
 */
function validateEmailRequest(data: unknown): data is EmailRequest {
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

/**
 * Generate email HTML from template
 */
function generateEmailHtml(
  template: string,
  subject: string,
  data: Record<string, unknown> = {}
): string {
  const { title, body, actionUrl, actionText, footer } = data as {
    title?: string
    body?: string
    actionUrl?: string
    actionText?: string
    footer?: string
  }

  const baseStyle = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { background: #f8fafc; padding: 40px 30px; border-radius: 0 0 12px 12px; }
    .content h2 { margin-top: 0; color: #1e293b; font-size: 20px; }
    .content p { margin-bottom: 16px; color: #475569; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; font-weight: 500; }
    .button:hover { background: #2563eb; }
    .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #64748b; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge-info { background: #dbeafe; color: #1d4ed8; }
    .badge-success { background: #dcfce7; color: #15803d; }
    .badge-warning { background: #fef3c7; color: #b45309; }
    .badge-error { background: #fee2e2; color: #b91c1c; }
  `

  // Escape all user-controlled strings before HTML interpolation
  const safeTitle = escapeHtml(title || subject)
  const safeBody = body ? escapeHtml(body) : ''
  const safeActionText = escapeHtml(actionText || '')
  const safeFooter = footer ? escapeHtml(footer) : ''
  // actionUrl is a URL — escape it to prevent attribute injection
  const safeActionUrl = actionUrl ? escapeHtml(actionUrl) : ''

  let templateHtml = ''

  switch (template) {
    case 'notification':
      templateHtml = `
        <div class="header">
          <h1>Notification</h1>
        </div>
        <div class="content">
          <h2>${safeTitle}</h2>
          ${safeBody ? `<p>${safeBody}</p>` : ''}
          ${safeActionUrl ? `<a href="${safeActionUrl}" class="button">${safeActionText || 'View Details'}</a>` : ''}
          <p class="footer">
            You received this notification because you're subscribed to updates in the Snaplog.
          </p>
        </div>
      `
      break

    case 'alert':
      templateHtml = `
        <div class="header">
          <h1>Alert</h1>
        </div>
        <div class="content">
          <h2>${safeTitle}</h2>
          ${safeBody ? `<p>${safeBody}</p>` : ''}
          ${safeActionUrl ? `<a href="${safeActionUrl}" class="button">${safeActionText || 'Take Action'}</a>` : ''}
          <p class="footer">
            This is an important alert from the Snaplog system.
          </p>
        </div>
      `
      break

    case 'invitation':
      templateHtml = `
        <div class="header">
          <h1>Invitation</h1>
        </div>
        <div class="content">
          <h2>${safeTitle}</h2>
          ${safeBody ? `<p>${safeBody}</p>` : ''}
          ${safeActionUrl ? `<a href="${safeActionUrl}" class="button">${safeActionText || 'Accept Invitation'}</a>` : ''}
          <p class="footer">
            You've been invited to collaborate in the Snaplog.
          </p>
        </div>
      `
      break

    case 'custom':
    default:
      templateHtml = `
        <div class="header">
          <h1>Snaplog</h1>
        </div>
        <div class="content">
          <h2>${safeTitle}</h2>
          ${safeBody ? `<p>${safeBody}</p>` : ''}
          ${safeActionUrl ? `<a href="${safeActionUrl}" class="button">${safeActionText || 'View'}</a>` : ''}
          ${safeFooter ? `<p class="footer">${safeFooter}</p>` : ''}
        </div>
      `
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>${baseStyle}</style>
    </head>
    <body>
      <div class="container">
        ${templateHtml}
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  // Only POST allowed
  const methodErr = requireMethod(req, 'POST')
  if (methodErr) return methodErr

  // Require authentication — unauthenticated callers must not trigger emails
  const auth = await requireUser(req)
  if (auth.response) return auth.response

  try {
    const data = await req.json()

    if (!validateEmailRequest(data)) {
      return json(
        { error: 'Invalid request format', details: 'Expected { to: string | string[], subject: string, ... }' },
        400
      )
    }

    const { to, subject, template = 'custom', templateData, html, text } = data as EmailRequest

    log.info('Sending email', { subject, template })

    // Generate HTML from template or use provided HTML
    const emailHtml = html || generateEmailHtml(template, subject, templateData)
    const emailText = text || (templateData?.body as string) || subject

    const emailData = {
      to: Array.isArray(to) ? to : [to],
      subject,
      html: emailHtml,
      text: emailText,
    }

    // TODO: Integrate with actual email service
    // Example with Resend:
    // const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    // await resend.emails.send({
    //   from: 'noreply@fabric-catalogue.com',
    //   to: emailData.to,
    //   subject: emailData.subject,
    //   html: emailData.html,
    //   text: emailData.text,
    // })

    // For now, we'll log the email and return success
    log.info('Email queued (placeholder)', { emailData })

    // Store email in audit log using valid CHECK constraint values
    const adminClient = createAdminClient()
    await adminClient.from('audit_log').insert({
      entity_type: 'event',
      entity_id: crypto.randomUUID(),
      action: 'create',
      changes: {
        type: 'email_sent',
        to: emailData.to,
        subject: emailData.subject,
        template,
      },
      performed_by: auth.user.id,
    })

    return json({
      success: true,
      message: 'Email queued successfully (placeholder - not actually sent)',
      data: {
        to: emailData.to,
        subject: emailData.subject,
        template,
      },
    })
  } catch (error) {
    log.error('Failed to send email', { error })

    return json(
      {
        error: 'Failed to send email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    )
  }
})
