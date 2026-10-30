/**
 * Require Admin Component
 *
 * Wrapper component that only renders children if the user has admin privileges.
 */

import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth, useProfileRole } from '@/features/auth'
import { supabase } from '@/lib/supabase/client'

interface RequireAdminProps {
  children: React.ReactNode
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, loading, error } = useAuth()
  const { isAdmin, isLoading: roleLoading } = useProfileRole()
  const location = useLocation()
  const navigate = useNavigate()

  // Auto-sign-out when session errors are detected
  useEffect(() => {
    if (error) {
      supabase.auth.signOut().finally(() => {
        navigate('/login', { replace: true })
      })
    }
  }, [error, navigate])

  // Loading state (auth or role fetch)
  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Session expired, redirecting...</p>
        </div>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    const redirectTo = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
    return <Navigate to={redirectTo} replace />
  }

  // Check if user has admin role.
  // Role is sourced from the profiles table (profiles.role), matching the RLS
  // enforcement layer. user_metadata is NOT authoritative.
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the admin panel.
          </p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    )
  }

  // Authenticated and has admin role
  return <>{children}</>
}

/**
 * Hook to check if the current user has admin privileges.
 *
 * Reads the profile role (source of truth, same as RLS).
 */
export function useIsAdmin() {
  const { user } = useAuth()
  const { isAdmin } = useProfileRole()
  return { isAdmin, user }
}
