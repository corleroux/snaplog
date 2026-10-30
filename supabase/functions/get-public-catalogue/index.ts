/**
 * Get Public Catalogue Edge Function
 *
 * Returns vendor and style data for a public share link.
 * Authenticated via x-share-token header (not user auth).
 *
 * Flow:
 * 1. Validate token from x-share-token header
 * 2. Look up share_links row (is_active=true, not expired)
 * 3. Fetch vendors and styles for the event
 * 4. Group styles by vendor and return JSON
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { handleCors, json, notFound, internalError } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/supabase.ts'
import { createLogger } from '../_shared/logger.ts'

const FUNCTION_NAME = 'get-public-catalogue'
const log = createLogger(FUNCTION_NAME)

// ============================================================================
// TYPES
// ============================================================================

interface ShareLink {
  id: string
  event_id: string
  name: string
  description: string | null
  expires_at: string | null
}

interface Vendor {
  id: string
  company_name: string
  booth_number: string | null
  country_of_origin: string | null
  brand_names: string | null
  images: Array<{ id: string; uri: string }> | null
}

interface Style {
  id: string
  vendor_id: string
  style_name: string
  color: string | null
  composition: string | null
  weight: string | null
  width: string | null
  price: string | null
  images: Array<{ id: string; uri: string }> | null
  category: string | null
  season: string | null
}

interface PublicCatalogueResponse {
  shareLink: {
    id: string
    name: string
    description: string | null
    expiresAt: string | null
  }
  vendors: Array<{
    id: string
    companyName: string
    boothNumber: string | null
    countryOfOrigin: string | null
    brandNames: string | null
    images: Array<{ id: string; uri: string }> | null
    styles: Array<{
      id: string
      styleName: string
      color: string | null
      composition: string | null
      weight: string | null
      width: string | null
      price: string | null
      images: Array<{ id: string; uri: string }> | null
      category: string | null
      season: string | null
    }>
  }>
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  // Handle CORS preflight
  const cors = handleCors(req)
  if (cors) return cors

  // Only accept GET requests
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, req)
  }

  // ============================================================================
  // VALIDATE TOKEN
  // ============================================================================

  const token = req.headers.get('x-share-token')
  if (!token) {
    return notFound('Link not found or expired', 'Missing token', req)
  }

  const adminClient = createAdminClient()

  // ============================================================================
  // LOOKUP SHARE LINK
  // ============================================================================

  const { data: shareLink, error: shareError } = await adminClient
    .from('share_links')
    .select('id, event_id, name, description, expires_at')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (shareError || !shareLink) {
    log.warn('Share link not found or inactive', { token, error: shareError?.message })
    return notFound('Link not found or expired', 'Invalid or inactive share link', req)
  }

  // Check expiry
  if (shareLink.expires_at) {
    const expiresAt = new Date(shareLink.expires_at)
    if (expiresAt < new Date()) {
      log.info('Share link expired', { token, expiresAt: shareLink.expires_at })
      return notFound('Link not found or expired', 'Share link has expired', req)
    }
  }

  log.info('Public catalogue accessed', { shareLinkId: shareLink.id, eventId: shareLink.event_id })

  // ============================================================================
  // FETCH VENDORS
  // ============================================================================

  const { data: vendors, error: vendorsError } = await adminClient
    .from('vendors')
    .select('id, company_name, booth_number, country_of_origin, brand_names, images')
    .eq('event_id', shareLink.event_id)
    .is('archived_at', null)
    .order('company_name')

  if (vendorsError) {
    log.error('Failed to fetch vendors', { error: vendorsError.message })
    return internalError('Failed to load catalogue data', 'Vendors query failed', req)
  }

  // ============================================================================
  // FETCH STYLES
  // ============================================================================

  const { data: styles, error: stylesError } = await adminClient
    .from('fabric_styles')
    .select('id, vendor_id, style_name, color, composition, weight, width, price, images, category, season')
    .eq('event_id', shareLink.event_id)
    .order('style_name')

  if (stylesError) {
    log.error('Failed to fetch styles', { error: stylesError.message })
    return internalError('Failed to load catalogue data', 'Styles query failed', req)
  }

  // ============================================================================
  // GROUP STYLES BY VENDOR
  // ============================================================================

  const stylesByVendor = new Map<string, Style[]>()
  for (const style of (styles || []) as Style[]) {
    const vendorStyles = stylesByVendor.get(style.vendor_id) || []
    vendorStyles.push(style)
    stylesByVendor.set(style.vendor_id, vendorStyles)
  }

  // ============================================================================
  // BUILD RESPONSE
  // ============================================================================

  const response: PublicCatalogueResponse = {
    shareLink: {
      id: shareLink.id,
      name: shareLink.name,
      description: shareLink.description,
      expiresAt: shareLink.expires_at,
    },
    vendors: (vendors || [] as Vendor[]).map(vendor => ({
      id: vendor.id,
      companyName: vendor.company_name,
      boothNumber: vendor.booth_number,
      countryOfOrigin: vendor.country_of_origin,
      brandNames: vendor.brand_names,
      images: vendor.images,
      styles: (stylesByVendor.get(vendor.id) || []).map(style => ({
        id: style.id,
        styleName: style.style_name,
        color: style.color,
        composition: style.composition,
        weight: style.weight,
        width: style.width,
        price: style.price,
        images: style.images,
        category: style.category,
        season: style.season,
      })),
    })),
  }

  // Update access count (fire and forget)
  adminClient
    .from('share_links')
    .update({ access_count: adminClient.rpc('increment', { row_id: shareLink.id }) })
    .eq('id', shareLink.id)
    .then(() => {})
    .catch((err: Error) => log.warn('Failed to update access count', { error: err.message }))

  return json(response, 200, req)
})
