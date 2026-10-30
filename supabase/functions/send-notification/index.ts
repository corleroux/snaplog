/**
 * Send Notification Edge Function
 *
 * Sends email notifications for various system events.
 * Uses Resend for email delivery.
 *
 * Environment Variables Required:
 * - RESEND_API_KEY: Resend API key for sending emails
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, requireMethod, json, badRequest, internalError, forbidden } from '../_shared/http.ts'
import { createLogger } from '../_shared/logger.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { escapeHtml } from '../_shared/escapeHtml.ts'
import { initEdgePostHog, captureException } from '../_shared/posthogEdge.ts'

initEdgePostHog()

const FUNCTION_NAME = 'send-notification'
const log = createLogger(FUNCTION_NAME)

// ============================================================================
// TYPES
// ============================================================================

interface SendNotificationRequest {
  userId: string
  type: 'welcome' | 'share_link_created' | 'vendor_added' | 'style_added' | 'weekly_summary'
  data: Record<string, unknown>
}

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

function getEmailTemplate(
  type: string,
  data: Record<string, unknown>
): EmailTemplate {
  const appUrl = Deno.env.get('APP_URL') || 'https://tradefair-beta.vercel.app'

  switch (type) {
    case 'welcome': {
      const { userName } = data as { userName?: string }
      return {
        subject: 'Welcome to Snaplog',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Snaplog!</h2>
            <p>Hello${userName ? ` ${userName}` : ''},</p>
            <p>You've been invited to join the Snaplog system. You can now:</p>
            <ul>
              <li>Capture vendor and style information at trade fairs</li>
              <li>Manage your catalogue with AI-powered extraction</li>
              <li>Share catalogues with your team</li>
            </ul>
            <p>
              <a href="${appUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Get Started
              </a>
            </p>
          </div>
        `,
        text: `Welcome to Snaplog!\n\nYou've been invited to join the Snaplog system. Visit ${appUrl} to get started.`,
      }
    }

    case 'share_link_created': {
      const { eventName, shareUrl, createdBy } = data as {
        eventName: string
        shareUrl: string
        createdBy?: string
      }
      const safeEventName = escapeHtml(eventName)
      const safeShareUrl = escapeHtml(shareUrl)
      const safeCreatedBy = createdBy ? escapeHtml(createdBy) : null
      return {
        subject: `[Catalogue] ${safeEventName} - Shared Catalogue`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Catalogue Shared</h2>
            <p>A catalogue for <strong>${safeEventName}</strong> has been shared with you.</p>
            ${safeCreatedBy ? `<p>Shared by: ${safeCreatedBy}</p>` : ''}
            <p>
              <a href="${safeShareUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View Catalogue
              </a>
            </p>
          </div>
        `,
        text: `A catalogue for ${safeEventName} has been shared with you.\n\nView it here: ${shareUrl}`,
      }
    }

    case 'vendor_added': {
      const { eventName, vendorName, vendorCount } = data as {
        eventName: string
        vendorName: string
        vendorCount?: number
      }
      const safeEventName = escapeHtml(eventName)
      const safeVendorName = escapeHtml(vendorName)
      return {
        subject: `[Catalogue] ${safeEventName} - New Vendor Added`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Vendor Added</h2>
            <p>A new vendor has been added to <strong>${safeEventName}</strong>:</p>
            <p style="font-size: 18px; font-weight: bold; color: #007bff;">${safeVendorName}</p>
            ${vendorCount ? `<p>Total vendors: ${vendorCount}</p>` : ''}
            <p>
              <a href="${appUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View in App
              </a>
            </p>
          </div>
        `,
        text: `A new vendor has been added to ${safeEventName}:\n\n${safeVendorName}\n\nView in app: ${appUrl}`,
      }
    }

    case 'style_added': {
      const { eventName, vendorName, styleCount } = data as {
        eventName: string
        vendorName?: string
        styleCount?: number
      }
      const safeEventName = escapeHtml(eventName)
      const safeVendorName = vendorName ? escapeHtml(vendorName) : null
      return {
        subject: `[Catalogue] ${safeEventName} - New Style Added`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Style Added</h2>
            <p>A new style has been added to <strong>${safeEventName}</strong>.</p>
            ${safeVendorName ? `<p>Vendor: ${safeVendorName}</p>` : ''}
            ${styleCount ? `<p>Total styles: ${styleCount}</p>` : ''}
            <p>
              <a href="${appUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View in App
              </a>
            </p>
          </div>
        `,
        text: `A new style has been added to ${safeEventName}.\n\nView in app: ${appUrl}`,
      }
    }

    case 'weekly_summary': {
      const { eventName, vendorCount, styleCount, weekRange } = data as {
        eventName: string
        vendorCount: number
        styleCount: number
        weekRange: string
      }
      const safeEventName = escapeHtml(eventName)
      const safeWeekRange = escapeHtml(weekRange)
      return {
        subject: `[Catalogue] ${safeEventName} - Weekly Summary`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Weekly Summary</h2>
            <p>Here's your weekly summary for <strong>${safeEventName}</strong>:</p>
            <p><strong>Period:</strong> ${safeWeekRange}</p>
            <ul>
              <li>Vendors added: <strong>${vendorCount}</strong></li>
              <li>Styles added: <strong>${styleCount}</strong></li>
            </ul>
            <p>
              <a href="${appUrl}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                View Catalogue
              </a>
            </p>
          </div>
        `,
        text: `Weekly Summary for ${safeEventName} (${weekRange}):\n\nVendors added: ${vendorCount}\nStyles added: ${styleCount}\n\nView catalogue: ${appUrl}`,
      }
    }

    default:
      return {
        subject: 'Snaplog Notification',
        html: '<p>You have a new notification in Snaplog.</p>',
        text: 'You have a new notification in Snaplog.',
      }
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

  // ============================================================================
  // PARSE REQUEST
  // ============================================================================

  let requestBody: SendNotificationRequest
  try {
    requestBody = await req.json()
  } catch (err) {
    return badRequest('Invalid JSON')
  }

  const { userId, type, data } = requestBody

  if (!userId || !type || !data) {
    return badRequest('Missing required fields: userId, type, data')
  }

  // Validate type
  const validTypes = ['welcome', 'share_link_created', 'vendor_added', 'style_added', 'weekly_summary']
  if (!validTypes.includes(type)) {
    return badRequest(`Invalid type. Must be one of: ${validTypes.join(', ')}`)
  }

  // ============================================================================
  // AUTHORITY CHECK
  // Callers may only send notifications to themselves or if they are an admin.
  // This prevents any authenticated user from spamming any other user.
  // ============================================================================

  if (userId !== user.id) {
    const adminClient = createAdminClient()
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      log.warn('Non-admin user attempted to send notification to another user', {
        requestedBy: user.id,
        targetUserId: userId,
      })
      return forbidden('You can only send notifications to yourself unless you are an admin', req)
    }
  }

  log.info('Sending notification', { type, userId, requestedBy: user.id })

  try {
    // ============================================================================
    // GET USER EMAIL
    // ============================================================================

    const supabase = createAdminClient()

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      log.error('Failed to fetch user profile', { error: profileError?.message, userId })
      return internalError('Failed to fetch user profile')
    }

    if (!profile.email) {
      log.warn('User has no email address', { userId })
      return json({ success: false, error: 'User has no email address' }, 200, req)
    }

    // ============================================================================
    // GENERATE EMAIL
    // ============================================================================

    const emailTemplate = getEmailTemplate(type, data)

    // ============================================================================
    // SEND EMAIL via Resend
    // ============================================================================

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      log.error('RESEND_API_KEY not configured')
      return internalError('Email service not configured')
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Snaplog <noreply@tradefair-beta.vercel.app>',
        to: profile.email,
        ...emailTemplate,
      }),
    })

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text()
      log.error('Resend API error', { status: resendResponse.status, error: errorText })
      return internalError('Failed to send email')
    }

    const resendResult = await resendResponse.json()

    log.info('Email sent successfully', {
      type,
      userId,
      messageId: resendResult.id,
    })

    // ============================================================================
    // STORE IN-APP NOTIFICATION
    // ============================================================================

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: type === 'welcome' ? 'info' : 'success',
        title: emailTemplate.subject,
        body: emailTemplate.text.substring(0, 500), // Truncate for in-app display
        action_url: data.actionUrl as string | null || null,
      })

    if (notificationError) {
      log.warn('Failed to create in-app notification', { error: notificationError.message })
    }

    return json({ success: true, messageId: resendResult.id }, 200, req)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    log.error('Send notification failed', { error: errorMessage })
    captureException(err, { tags: { function: FUNCTION_NAME } })
    return internalError(errorMessage, 'Failed to send notification', req)
  }
})
