/**
 * User Management API
 *
 * Functions for managing users in the admin panel.
 */

import { supabase, invokeEdgeFunction } from '@/lib/supabase/client'

/**
 * User role type
 */
export type UserRole = 'admin' | 'editor' | 'viewer'

/**
 * User data from profiles table
 */
export interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  raw_user_meta_data: {
    full_name?: string
    role?: UserRole
    avatar_url?: string
  }
}

/**
 * Fetch all users via the get-admin-users edge function.
 *
 * auth.users is not accessible from the browser client — it requires the
 * service-role key, which is only safe to use server-side (edge function).
 */
export async function getUsers(): Promise<User[]> {
  const { data, error } = await invokeEdgeFunction<{ users: User[] }>('get-admin-users')

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data?.users ?? []
}

/**
 * Get user by ID — fetches all users via edge function and filters locally.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const users = await getUsers()
  return users.find((u) => u.id === userId) ?? null
}

/**
 * Invite a new user
 *
 * This creates a user record and sends an invitation email.
 * In production, you would use Supabase Auth's invite functionality.
 */
export async function inviteUser(email: string, role: UserRole, fullName?: string): Promise<void> {
  // In production, use Supabase Auth's admin API to invite the user
  // For now, we'll create a user profile record

  const { error: profileError } = await supabase.from('profiles').insert({
    id: crypto.randomUUID(), // This would be the user's auth ID after they accept the invite
    email,
    full_name: fullName || null,
    role,
  })

  if (profileError) {
    throw new Error(`Failed to create user profile: ${profileError.message}`)
  }

  // TODO: Send invitation email
  // This would integrate with Supabase Auth's invitation system
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  // Update user metadata
  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  })

  if (authError) {
    throw new Error(`Failed to update user role: ${authError.message}`)
  }

  // Also update profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (profileError) {
    throw new Error(`Failed to update profile role: ${profileError.message}`)
  }
}

/**
 * Remove user (soft delete by setting role to 'viewer' or blocking)
 */
export async function removeUser(userId: string): Promise<void> {
  // In production, you might want to:
  // 1. Revoke all sessions
  // 2. Set a blocked flag
  // 3. Or delete the user entirely

  // For now, we'll just update their role to 'viewer'
  await updateUserRole(userId, 'viewer')
}

/**
 * Get user statistics derived from the edge-function user list.
 */
export async function getUserStats(): Promise<{
  total: number
  activeThisMonth: number
  byRole: Record<UserRole, number>
}> {
  const users = await getUsers()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const activeThisMonth = users.filter(
    (u) => u.last_sign_in_at && new Date(u.last_sign_in_at) >= startOfMonth
  ).length

  const byRole: Record<UserRole, number> = { admin: 0, editor: 0, viewer: 0 }
  users.forEach((u) => {
    const role = (u.raw_user_meta_data.role ?? 'viewer') as UserRole
    if (role in byRole) {
      byRole[role]++
    }
  })

  return {
    total: users.length,
    activeThisMonth,
    byRole,
  }
}
