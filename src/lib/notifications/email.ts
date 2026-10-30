/**
 * Email Service API
 *
 * Client-side functions for sending emails via the edge function.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Email template types
 */
export type EmailTemplate = 'notification' | 'alert' | 'invitation' | 'custom'

/**
 * Email send options
 */
export interface SendEmailOptions {
  to: string | string[]
  subject: string
  template?: EmailTemplate
  templateData?: {
    title?: string
    body?: string
    actionUrl?: string
    actionText?: string
    footer?: string
  }
  html?: string
  text?: string
}

/**
 * Send an email via the edge function
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; message: string }> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: options,
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  return data as { success: boolean; message: string }
}

/**
 * Send a notification email
 */
export async function sendNotificationEmail(options: {
  to: string
  subject: string
  body: string
  actionUrl?: string
}): Promise<{ success: boolean; message: string }> {
  return sendEmail({
    to: options.to,
    subject: options.subject,
    template: 'notification',
    templateData: {
      title: options.subject,
      body: options.body,
      actionUrl: options.actionUrl,
      actionText: 'View Details',
    },
  })
}

/**
 * Send an alert email
 */
export async function sendAlertEmail(options: {
  to: string
  subject: string
  body: string
  actionUrl?: string
}): Promise<{ success: boolean; message: string }> {
  return sendEmail({
    to: options.to,
    subject: options.subject,
    template: 'alert',
    templateData: {
      title: options.subject,
      body: options.body,
      actionUrl: options.actionUrl,
      actionText: 'Take Action',
    },
  })
}

/**
 * Send an invitation email
 */
export async function sendInvitationEmail(options: {
  to: string
  subject: string
  body: string
  actionUrl: string
}): Promise<{ success: boolean; message: string }> {
  return sendEmail({
    to: options.to,
    subject: options.subject,
    template: 'invitation',
    templateData: {
      title: options.subject,
      body: options.body,
      actionUrl: options.actionUrl,
      actionText: 'Accept Invitation',
    },
  })
}
