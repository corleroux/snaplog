import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { ErrorReport } from './reporting'
import { formatErrorReport } from './reporting'

interface ErrorTrackingState {
  errors: ErrorReport[]
  pollLog: Array<{ id: string; issues_synced: number; new_issues: number; created_at: string }>
  loading: boolean
  lastSyncAt: string | null
  sync: () => Promise<void>
  refresh: () => Promise<void>
}

const ErrorTrackingContext = createContext<ErrorTrackingState | null>(null)

export function ErrorTrackingProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [pollLog, setPollLog] = useState<ErrorTrackingState['pollLog']>([])
  const [loading, setLoading] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)

  const sync = useCallback(async () => {
    setLoading(true)
    try {
      const { error } = await supabase.functions.invoke('poll-posthog-errors', {
        body: { action: 'sync' },
      })
      if (error) throw error
      setLastSyncAt(new Date().toISOString())
      await refresh()
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(async () => {
    const [errorsRes, pollRes] = await Promise.all([
      supabase.from('posthog_errors').select('*').order('last_seen', { ascending: false }).limit(50),
      supabase.from('posthog_poll_log').select('id, issues_synced, new_issues, created_at').order('created_at', { ascending: false }).limit(10),
    ])

    if (errorsRes.data) {
      setErrors(errorsRes.data.map(row => formatErrorReport(row.raw_payload as any)))
    }
    if (pollRes.data) {
      setPollLog(pollRes.data)
    }
  }, [])

  return (
    <ErrorTrackingContext.Provider value={{ errors, pollLog, loading, lastSyncAt, sync, refresh }}>
      {children}
    </ErrorTrackingContext.Provider>
  )
}

export function useErrorTracking(): ErrorTrackingState {
  const ctx = useContext(ErrorTrackingContext)
  if (!ctx) throw new Error('useErrorTracking must be used within ErrorTrackingProvider')
  return ctx
}
