/**
 * Shared Links API
 *
 * Functions for creating and managing public share links for catalogues.
 */

import { supabase } from '@/lib/supabase/client'

/**
 * Types of shared links
 */
export type SharedLinkType = 'event_catalogue' | 'vendor' | 'style'

/**
 * Shared link data
 */
export interface SharedLink {
  id: string
  token: string
  link_type: SharedLinkType
  event_id?: string | null
  vendor_id?: string | null
  style_id?: string | null
  created_by?: string | null
  created_at: string
  expires_at?: string | null
  last_accessed_at?: string | null
  access_count: number
  is_active: boolean
  password_hash?: string | null
}

/**
 * Options for creating a shared link
 */
export interface CreateSharedLinkOptions {
  type: SharedLinkType
  eventId?: string
  vendorId?: string
  styleId?: string
  expiresInDays?: number // null or undefined means no expiration
  password?: string // Optional password protection
}

/**
 * Generate a random token for the shared link
 */
function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 16; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Create a new shared link
 */
export async function createSharedLink(options: CreateSharedLinkOptions): Promise<SharedLink> {
  const { type, eventId, vendorId, styleId, expiresInDays, password } = options

  // Calculate expiration date
  let expiresAt: string | null = null
  if (expiresInDays !== undefined && expiresInDays !== null) {
    const date = new Date()
    date.setDate(date.getDate() + expiresInDays)
    expiresAt = date.toISOString()
  }

  // Hash password if provided
  let passwordHash: string | null = null
  if (password) {
    // In production, this should be done server-side with bcrypt
    // For now, we'll store a simple hash (not secure for production!)
    passwordHash = btoa(password)
  }

  // Generate unique token
  let token = generateToken()
  let isUnique = false
  let attempts = 0

  while (!isUnique && attempts < 10) {
    const { data: existing } = await supabase
      .from('shared_links')
      .select('token')
      .eq('token', token)
      .single()

    if (!existing) {
      isUnique = true
    } else {
      token = generateToken()
      attempts++
    }
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique token')
  }

  // Create the link
  const { data, error } = await supabase
    .from('shared_links')
    .insert({
      token,
      link_type: type,
      event_id: eventId || null,
      vendor_id: vendorId || null,
      style_id: styleId || null,
      expires_at: expiresAt,
      password_hash: passwordHash,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create shared link: ${error.message}`)
  }

  return data
}

/**
 * Get a shared link by token
 */
export async function getSharedLink(token: string): Promise<SharedLink | null> {
  const { data, error } = await supabase
    .from('shared_links')
    .select('*')
    .eq('token', token)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null
  }

  // Increment access count
  await supabase.rpc('increment_link_access', { link_id: data.id })

  return data
}

/**
 * Get all shared links for the current user
 */
export async function getMySharedLinks(): Promise<SharedLink[]> {
  const { data, error } = await supabase
    .from('shared_links')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch shared links: ${error.message}`)
  }

  return data || []
}

/**
 * Delete a shared link
 */
export async function deleteSharedLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_links')
    .delete()
    .eq('id', linkId)

  if (error) {
    throw new Error(`Failed to delete shared link: ${error.message}`)
  }
}

/**
 * Deactivate a shared link (soft delete)
 */
export async function deactivateSharedLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_links')
    .update({ is_active: false })
    .eq('id', linkId)

  if (error) {
    throw new Error(`Failed to deactivate shared link: ${error.message}`)
  }
}

/**
 * Generate the public URL for a shared link
 */
export function getSharedLinkUrl(token: string, baseUrl: string = window.location.origin): string {
  return `${baseUrl}/share/${token}`
}

/**
 * Validate a shared link password
 */
export function validateSharedLinkPassword(link: SharedLink, password: string): boolean {
  if (!link.password_hash) {
    return true // No password set
  }

  // Simple hash comparison (not secure for production!)
  return btoa(password) === link.password_hash
}
