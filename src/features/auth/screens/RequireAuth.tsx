import { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '../hooks/useAuth'

interface RequireAuthProps {
  children: React.ReactNode
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading, error } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Auto-sign-out when session errors are detected — forces redirect to login
  useEffect(() => {
    if (error) {
      supabase.auth.signOut().finally(() => {
        navigate('/login', { replace: true })
      })
    }
  }, [error, navigate])

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Error state — auto-sign-out is triggered by the useEffect above
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

  // Authenticated
  return <>{children}</>
}
