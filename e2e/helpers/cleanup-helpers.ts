/**
 * Cleanup Helpers
 *
 * Helper functions for cleaning up test data:
 * - Delete events and related data
 * - Delete vendors and related styles
 * - Delete styles and variants
 * - Delete share tokens
 * - Cleanup by name pattern (for timestamped test data)
 */

import { createClient } from '@supabase/supabase-js'

// Load .env.staging file for environment variables
// This is needed because Playwright doesn't auto-load .env files
import { config } from 'dotenv'
import { resolve } from 'path'

// Try to load .env.staging, fallback to .env
const envPath = resolve(process.cwd(), '.env.staging')
config({ path: envPath })

// Get Supabase credentials from environment
// Support both VITE_ prefix (for Vite) and plain names (for tests)
const supabaseUrl = process.env.VITE_SUPABASE_URL
  || process.env.SUPABASE_URL
  || 'https://sqshnzkgqdoiocnaunpu.supabase.co'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
  || process.env.SUPABASE_ANON_KEY
  || ''

/**
 * Create a Supabase client with service role for delete operations
 */
function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey
  return createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Delete an event and all related data (vendors, styles, variants, share tokens)
 * CASCADE should handle most of this in the database, but we'll be explicit
 */
export async function cleanupEvent(eventId: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    // Delete share tokens first (no cascade)
    await supabase
      .from('shared_catalogs')
      .delete()
      .eq('event_id', eventId)

    // Delete event members
    await supabase
      .from('event_members')
      .delete()
      .eq('event_id', eventId)

    // Delete the event (cascade should delete vendors, styles, variants, images)
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error(`Failed to delete event ${eventId}:`, error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Error deleting event:', err)
    return false
  }
}

/**
 * Delete a vendor and all related styles and variants
 */
export async function cleanupVendor(vendorId: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    // Delete the vendor (cascade should delete styles, variants, images)
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId)

    if (error) {
      console.error(`Failed to delete vendor ${vendorId}:`, error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Error deleting vendor:', err)
    return false
  }
}

/**
 * Delete a style and all variants
 */
export async function cleanupStyle(styleId: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    // Delete the style (cascade should delete variants, images)
    const { error } = await supabase
      .from('fabric_styles')
      .delete()
      .eq('id', styleId)

    if (error) {
      console.error(`Failed to delete style ${styleId}:`, error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Error deleting style:', err)
    return false
  }
}

/**
 * Delete a variant
 */
export async function cleanupVariant(variantId: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    const { error } = await supabase
      .from('fabric_variants')
      .delete()
      .eq('id', variantId)

    if (error) {
      console.error(`Failed to delete variant ${variantId}:`, error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Error deleting variant:', err)
    return false
  }
}

/**
 * Delete a share token
 */
export async function cleanupSharedToken(token: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    const { error } = await supabase
      .from('shared_catalogs')
      .delete()
      .eq('token', token)

    if (error) {
      console.error(`Failed to delete share token ${token}:`, error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Error deleting share token:', err)
    return false
  }
}

/**
 * Cleanup all test data created during a test run
 * Matches entities with names starting with "E2E Test" or containing a timestamp
 */
export async function cleanupTestData(userId?: string): Promise<number> {
  const supabase = createAdminClient()
  let deletedCount = 0

  try {
    // Find all events with "E2E Test" in the name
    let query = supabase
      .from('events')
      .select('id')
      .like('name', 'E2E Test%')

    if (userId) {
      query = query.eq('owner_id', userId)
    }

    const { data: events } = await query

    if (events) {
      for (const event of events) {
        const success = await cleanupEvent(event.id)
        if (success) deletedCount++
      }
    }

    return deletedCount
  } catch (err) {
    console.error('Error cleaning up test data:', err)
    return deletedCount
  }
}

/**
 * Cleanup events created after a specific timestamp
 * Useful for cleaning up tests that ran after a certain point
 */
export async function cleanupEventsAfter(timestamp: Date, userId?: string): Promise<number> {
  const supabase = createAdminClient()
  let deletedCount = 0

  try {
    let query = supabase
      .from('events')
      .select('id')
      .gt('created_at', timestamp.toISOString())

    if (userId) {
      query = query.eq('owner_id', userId)
    }

    const { data: events } = await query

    if (events) {
      for (const event of events) {
        const success = await cleanupEvent(event.id)
        if (success) deletedCount++
      }
    }

    return deletedCount
  } catch (err) {
    console.error('Error cleaning up events after timestamp:', err)
    return deletedCount
  }
}

/**
 * Delete all data for a specific user (use with caution!)
 */
export async function cleanupUserData(userId: string): Promise<boolean> {
  const supabase = createAdminClient()

  try {
    // Delete all events owned by user (cascade handles the rest)
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('owner_id', userId)

    if (error) {
      console.error(`Failed to delete user data for ${userId}:`, error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('Error deleting user data:', err)
    return false
  }
}

/**
 * Cleanup orphaned images (images not linked to any entity)
 * Run periodically to keep storage clean
 */
export async function cleanupOrphanedImages(): Promise<number> {
  const supabase = createAdminClient()

  try {
    // This would require a custom SQL function or edge function
    // For now, just return 0
    // TODO: Implement via edge function or SQL
    return 0
  } catch (err) {
    console.error('Error cleaning up orphaned images:', err)
    return 0
  }
}
