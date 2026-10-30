import { supabase } from './client'

/**
 * Get the current authenticated user's ID.
 *
 * Used for setting created_by and updated_by fields.
 *
 * @returns The user ID or null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser()

  return user?.id ?? null
}
