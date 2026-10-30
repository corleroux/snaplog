import { useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { AuthSessionError } from '@/lib/errors'
import { posthog } from '@/lib/posthog'

export interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    let mounted = true

    // Get initial session
    posthog.addExceptionStep('Fetching initial auth session')
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return

      if (error) {
        const authError = error instanceof AuthSessionError
          ? error
          : new AuthSessionError(error.message, 'unknown')
        posthog.captureException(authError)

        if (mounted) {
          setState({
            session: null,
            user: null,
            loading: false,
            error: 'Failed to initialize session. Please try again.',
          })
        }
        return
      }

      if (mounted) {
        // Identify the user in PostHog for session correlation
        if (session?.user) {
          posthog.identify(session.user.id, { email: session.user.email })
        } else {
          posthog.reset()
        }

        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          error: null,
        })
      }
    })

    // Listen for auth changes (includes token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'TOKEN_REFRESHED') {
        posthog.addExceptionStep('Auth token refreshed')
        posthog.capture('auth_token_refreshed')
      }

      if (event === 'SIGNED_OUT') {
        posthog.addExceptionStep('User signed out')
        posthog.capture('auth_signed_out')
        posthog.reset()
      }

      if ((event as string) === 'AUTH_ERROR') {
        posthog.capture('auth_error', {
          has_session: !!session,
        })
      }

      if (mounted) {
        // Keep PostHog identity in sync with auth state
        if (session?.user) {
          posthog.identify(session.user.id, { email: session.user.email })
        }

        setState({
          session,
          user: session?.user ?? null,
          loading: false,
          // Only show error when session is missing AND user didn't explicitly sign out
          error: session ? null : (event === 'SIGNED_OUT' ? null : 'Session expired. Please sign in again.'),
        })
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return state
}
