/**
 * Email Catalogue API
 *
 * Functions for sending catalogues via email.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Options for sending a catalogue email
 */
export interface EmailCatalogueOptions {
  to: string | string[]
  subject?: string
  message?: string
  includePdf?: boolean
}

/**
 * Send a catalogue via email
 *
 * @param eventId - The ID of the event
 * @param options - Email options
 */
export async function sendCatalogueEmail(
  eventId: string,
  options: EmailCatalogueOptions
): Promise<void> {
  const { to, subject, message } = options

  // Fetch event details for the email subject
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('name')
    .eq('id', eventId)
    .single()

  if (eventError) {
    throw new Error(`Failed to fetch event: ${eventError.message}`)
  }

  // Generate share URL for the catalogue
  const shareUrl = `${window.location.origin}/share/event/${eventId}`

  // Default subject
  const emailSubject = subject || `Snaplog: ${event.name}`

  // Call the edge function
  const { data, error } = await supabase.functions.invoke('send-email-catalogue', {
    body: {
      to,
      subject: emailSubject,
      catalogueUrl: shareUrl,
      eventId,
      message,
    },
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  if (data.error) {
    throw new Error(`Failed to send email: ${data.error}`)
  }
}

/**
 * Send a vendor or style via email
 *
 * @param type - The type of entity ('vendor' or 'style')
 * @param id - The ID of the entity
 * @param options - Email options
 */
export async function sendEntityEmail(
  type: 'vendor' | 'style',
  id: string,
  options: EmailCatalogueOptions
): Promise<void> {
  const { to, subject, message } = options

  let entityName = ''
  let shareUrl = ''

  if (type === 'vendor') {
    const { data: vendor, error } = await supabase
      .from('vendors')
      .select('company_name')
      .eq('id', id)
      .single()

    if (error || !vendor) {
      throw new Error(`Failed to fetch vendor: ${error?.message || 'Not found'}`)
    }

    entityName = vendor.company_name
    shareUrl = `${window.location.origin}/share/vendor/${id}`
  } else {
    const { data: style, error } = await supabase
      .from('fabric_styles')
      .select('name, vendors!inner(company_name)')
      .eq('id', id)
      .single()

    if (error || !style) {
      throw new Error(`Failed to fetch style: ${error?.message || 'Not found'}`)
    }

    entityName = style.name
    shareUrl = `${window.location.origin}/share/style/${id}`
  }

  // Default subject
  const emailSubject = subject || `${type === 'vendor' ? 'Vendor' : 'Style'}: ${entityName}`

  // Call the edge function
  const { data, error } = await supabase.functions.invoke('send-email-catalogue', {
    body: {
      to,
      subject: emailSubject,
      catalogueUrl: shareUrl,
      message,
    },
  })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  if (data.error) {
    throw new Error(`Failed to send email: ${data.error}`)
  }
}
