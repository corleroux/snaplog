import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export type ProfileRole = 'admin' | 'superadmin' | 'user' | null

export interface UseProfileRoleResult {
  role: ProfileRole
  isLoading: boolean
  isAdmin: boolean
}

/**
 * Hook to check the current user's global role from the profiles table.
 *
 * RLS policies authorize admin actions via `profiles.role` (NOT app_metadata),
 * so the frontend must read the same source of truth for UI gating.
 */
export function useProfileRole(): UseProfileRoleResult {
  const [role, setRole] = useState<ProfileRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const fetchRole = async () => {
      setIsLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (mounted) {
          setRole(null)
          setIsLoading(false)
        }
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (mounted) {
        const r = (data?.role ?? 'user') as ProfileRole
        setRole(r)
        setIsLoading(false)
      }
    }

    fetchRole()

    return () => {
      mounted = false
    }
  }, [])

  return {
    role,
    isLoading,
    isAdmin: role === 'admin' || role === 'superadmin',
  }
}
