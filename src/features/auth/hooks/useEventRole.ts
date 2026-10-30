import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

export type EventRole = 'owner' | 'admin' | 'editor' | 'viewer' | null

export interface UseEventRoleResult {
  role: EventRole
  isLoading: boolean
  canEdit: boolean
  canDelete: boolean
}

/**
 * Hook to check the current user's role within a specific event.
 *
 * Queries the event_members table and provides derived boolean flags
 * for UI gating (UX only -- RLS remains the enforcement layer).
 */
export function useEventRole(eventId: string | undefined): UseEventRoleResult {
  const [role, setRole] = useState<EventRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    if (!eventId) {
      setRole(null)
      setIsLoading(false)
      return
    }

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
        .from('event_members')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .single()

      if (mounted) {
        setRole(data?.role ?? null)
        setIsLoading(false)
      }
    }

    fetchRole()

    return () => {
      mounted = false
    }
  }, [eventId])

  return {
    role,
    isLoading,
    canEdit: role !== null && role !== 'viewer',
    canDelete: role === 'owner' || role === 'admin',
  }
}
