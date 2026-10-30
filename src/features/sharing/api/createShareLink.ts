/**
 * Public Sharing API Functions
 *
 * Functions for creating and managing public share links for event catalogues.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Hash a share link password using SHA-256 via the Web Crypto API.
 * Not bcrypt (no salt/key-stretching) but cryptographically sound and dependency-free.
 * Upgrade to bcrypt post-launch if share link security becomes a higher priority.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export interface ShareLink {
  id: string
  token: string
  eventId: string
  createdById: string
  createdBy: {
    id: string
    email: string | null
    fullName: string | null
  } | null
  name: string | null
  description: string | null
  passwordHash: string | null
  requiresPassword: boolean
  expiresAt: string | null
  accessCount: number
  lastAccessedAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ShareLinkInput {
  eventId: string
  name?: string
  description?: string
  password?: string
  expiresAt?: Date | null
}

export interface PublicShareLink {
  id: string
  token: string
  eventId: string
  name: string | null
  description: string | null
  expiresAt: string | null
  requiresPassword: boolean
}

export interface PublicCatalogueStyle {
  id: string
  vendorId: string
  styleName: string
  color: string
  composition: string
  weight: string
  width: string
  price: string
  images: Array<{ id: string; uri: string }>
  category?: string
  season?: string
}

export interface PublicCatalogueVendor {
  id: string
  companyName: string
  boothNumber: string
  countryOfOrigin: string
  brandNames: string
  images: Array<{ id: string; uri: string }>
  styles: PublicCatalogueStyle[]
}

export interface PublicCatalogueResponse {
  shareLink: PublicShareLink
  vendors: PublicCatalogueVendor[]
}

/**
 * Get all share links for an event
 */
export async function getEventShareLinks(eventId: string): Promise<ShareLink[]> {
  const { data, error } = await supabase
    .from('share_links')
    .select(`
      *,
      created_by_user:user_id(id, email, full_name)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.id,
    token: item.token,
    eventId: item.event_id,
    createdById: item.created_by,
    createdBy: item.created_by_user ? {
      id: item.created_by_user.id,
      email: item.created_by_user.email,
      fullName: item.created_by_user.full_name
    } : null,
    name: item.name,
    description: item.description,
    passwordHash: item.password_hash,
    requiresPassword: item.password_hash !== null,
    expiresAt: item.expires_at,
    accessCount: item.access_count || 0,
    lastAccessedAt: item.last_accessed_at,
    isActive: item.is_active,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  }))
}

/**
 * Create a new share link
 */
export async function createShareLink(input: ShareLinkInput): Promise<ShareLink> {
  const shareLinkData: Record<string, unknown> = {
    event_id: input.eventId,
    name: input.name || null,
    description: input.description || null,
    expires_at: input.expiresAt?.toISOString() || null
  }

  if (input.password) {
    shareLinkData.password_hash = await hashPassword(input.password)
  }

  const { data, error } = await supabase
    .from('share_links')
    .insert(shareLinkData)
    .select()
    .single()

  if (error) throw error

  // Get creator info
  const { data: userData } = await supabase.auth.getUser()

  return {
    id: data.id,
    token: data.token,
    eventId: data.event_id,
    createdById: data.created_by,
    createdBy: userData?.user ? {
      id: userData.user.id,
      email: userData.user.email || null,
      fullName: userData.user.user_metadata?.full_name || null
    } : null,
    name: data.name,
    description: data.description,
    passwordHash: data.password_hash,
    requiresPassword: data.password_hash !== null,
    expiresAt: data.expires_at,
    accessCount: data.access_count || 0,
    lastAccessedAt: data.last_accessed_at,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

/**
 * Update a share link
 */
export async function updateShareLink(
  shareLinkId: string,
  updates: Partial<Omit<ShareLinkInput, 'eventId'>>
): Promise<void> {
  const updateData: Record<string, unknown> = {}

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.expiresAt !== undefined) {
    updateData.expires_at = updates.expiresAt?.toISOString() || null
  }

  if (updates.password !== undefined) {
    updateData.password_hash = updates.password ? await hashPassword(updates.password) : null
  }

  const { error } = await supabase
    .from('share_links')
    .update(updateData)
    .eq('id', shareLinkId)

  if (error) throw error
}

/**
 * Delete (deactivate) a share link
 */
export async function deleteShareLink(shareLinkId: string): Promise<void> {
  const { error } = await supabase
    .from('share_links')
    .update({ is_active: false })
    .eq('id', shareLinkId)

  if (error) throw error
}

/**
 * Get public share link by token (for public view)
 */
export async function getPublicShareLink(token: string): Promise<PublicShareLink | null> {
  const { data, error } = await supabase
    .rpc('get_share_link_by_token', { token_param: token })

  if (error) throw error
  if (!data || data.length === 0) return null

  const link = data[0]

  // Increment access count (fire and forget)
  supabase.rpc('increment_share_link_access', { share_link_id: link.id })

  return {
    id: link.id,
    token: token,
    eventId: link.event_id,
    name: link.name,
    description: link.description,
    expiresAt: link.expires_at,
    requiresPassword: link.requires_password
  }
}

/**
 * Verify password for a share link
 */
export async function verifyShareLinkPassword(
  token: string,
  password: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('get_share_link_by_token', { token_param: token })

  if (error) throw error
  if (!data || data.length === 0) return false

  const link = data[0]

  // If no password required, return true
  if (!link.password_hash) return true

  return link.password_hash === await hashPassword(password)
}

/**
 * Get share link URL
 */
export function getShareLinkUrl(token: string): string {
  // Use current origin for URL
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/share/${token}`
}

/**
 * Get public catalogue data via Edge Function
 */
export async function getPublicCatalogue(token: string): Promise<PublicCatalogueResponse> {
  const { data, error } = await supabase.functions.invoke('get-public-catalogue', {
    headers: { 'x-share-token': token }
  })
  if (error) throw new Error(error.message)
  return data
}
