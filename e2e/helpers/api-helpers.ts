/**
 * API Helpers
 *
 * Helper functions for direct Supabase API calls in E2E tests:
 * - Create test data
 * - Query database state
 * - Clean up test data
 */

import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Create a Supabase client for test operations
 */
export function createTestClient(serviceKey?: string) {
  const key = serviceKey || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Create a test event via API
 */
export async function createTestEvent(data: {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  location?: string
  owner_id?: string
}) {
  const supabase = createTestClient()

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      name: data.name,
      description: data.description,
      start_date: data.start_date || new Date().toISOString(),
      end_date: data.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: data.location,
      owner_id: data.owner_id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test event: ${error.message}`)
  }

  return event
}

/**
 * Create a test vendor via API
 */
export async function createTestVendor(eventId: string, data: {
  company_name: string
  booth_number?: string
  contact_name?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  notes?: string
  owner_id?: string
}) {
  const supabase = createTestClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .insert({
      event_id: eventId,
      company_name: data.company_name,
      booth_number: data.booth_number,
      contact_name: data.contact_name,
      email: data.email,
      phone: data.phone,
      website: data.website,
      address: data.address,
      notes: data.notes,
      owner_id: data.owner_id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test vendor: ${error.message}`)
  }

  return vendor
}

/**
 * Create a test style via API
 */
export async function createTestStyle(vendorId: string, data: {
  name: string
  category?: string
  season?: string
  composition?: string
  width?: string
  weight?: string
  price?: number
  currency?: string
  notes?: string
  owner_id?: string
}) {
  const supabase = createTestClient()

  const { data: style, error } = await supabase
    .from('fabric_styles')
    .insert({
      vendor_id: vendorId,
      name: data.name,
      category: data.category,
      season: data.season,
      composition: data.composition,
      width: data.width,
      weight: data.weight,
      price: data.price,
      currency: data.currency || 'USD',
      notes: data.notes,
      owner_id: data.owner_id,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test style: ${error.message}`)
  }

  return style
}

/**
 * Create a test variant via API
 */
export async function createTestVariant(styleId: string, data: {
  color?: string
  size?: string
  sku?: string
  stock_quantity?: number
  price?: number
}) {
  const supabase = createTestClient()

  const { data: variant, error } = await supabase
    .from('fabric_variants')
    .insert({
      style_id: styleId,
      color: data.color,
      size: data.size,
      sku: data.sku,
      stock_quantity: data.stock_quantity || 0,
      price: data.price,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create test variant: ${error.message}`)
  }

  return variant
}

/**
 * Query event by ID
 */
export async function getEvent(eventId: string) {
  const supabase = createTestClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error) {
    throw new Error(`Failed to get event: ${error.message}`)
  }

  return data
}

/**
 * Query vendor by ID
 */
export async function getVendor(vendorId: string) {
  const supabase = createTestClient()

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', vendorId)
    .single()

  if (error) {
    throw new Error(`Failed to get vendor: ${error.message}`)
  }

  return data
}

/**
 * Query style by ID
 */
export async function getStyle(styleId: string) {
  const supabase = createTestClient()

  const { data, error } = await supabase
    .from('fabric_styles')
    .select('*')
    .eq('id', styleId)
    .single()

  if (error) {
    throw new Error(`Failed to get style: ${error.message}`)
  }

  return data
}

/**
 * List all events for a user
 */
export async function listEvents(userId: string) {
  const supabase = createTestClient()

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .or(`owner_id.eq.${userId},id.in.(select event_id from event_members where user_id=${userId})`)

  if (error) {
    throw new Error(`Failed to list events: ${error.message}`)
  }

  return data || []
}

/**
 * List all vendors for an event
 */
export async function listVendors(eventId: string) {
  const supabase = createTestClient()

  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('event_id', eventId)

  if (error) {
    throw new Error(`Failed to list vendors: ${error.message}`)
  }

  return data || []
}

/**
 * List all styles for a vendor
 */
export async function listStyles(vendorId: string) {
  const supabase = createTestClient()

  const { data, error } = await supabase
    .from('fabric_styles')
    .select('*')
    .eq('vendor_id', vendorId)

  if (error) {
    throw new Error(`Failed to list styles: ${error.message}`)
  }

  return data || []
}

/**
 * Count entities matching a filter
 */
export async function countEntities(table: string, filter: Record<string, any>): Promise<number> {
  const supabase = createTestClient()

  let query = supabase.from(table).select('*', { count: 'exact', head: true })

  Object.entries(filter).forEach(([key, value]) => {
    query = query.eq(key, value)
  })

  const { count, error } = await query

  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`)
  }

  return count || 0
}

/**
 * Get share token by event ID
 */
export async function getShareToken(eventId: string) {
  const supabase = createTestClient()

  const { data, error } = await supabase
    .from('shared_catalogs')
    .select('token')
    .eq('event_id', eventId)
    .single()

  if (error) {
    return null
  }

  return data?.token || null
}
