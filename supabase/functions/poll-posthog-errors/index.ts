import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors, requireMethod, json } from '../_shared/http.ts'
import { createAdminClient } from '../_shared/supabase.ts'
import { createLogger } from '../_shared/logger.ts'

const POSTHOG_API_BASE = 'https://us.i.posthog.com'
const POSTHOG_PROJECT_ID = '403472'

interface PostHogIssue {
  id: string
  name: string
  description: string
  status: string
  first_seen: string
}

interface PostHogIssueListResponse {
  results: PostHogIssue[]
  next?: string
}

async function listIssues(apiKey: string): Promise<PostHogIssueListResponse> {
  const url = new URL(`${POSTHOG_API_BASE}/api/environments/${POSTHOG_PROJECT_ID}/error_tracking/issues/`)
  url.searchParams.set('status', 'active')
  url.searchParams.set('limit', '100')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`PostHog API ${res.status}: ${await res.text()}`)
  return res.json()
}

serve(async (req) => {
  const log = createLogger('poll-posthog-errors')

  const cors = handleCors(req)
  if (cors) return cors

  const methodErr = requireMethod(req, 'POST')
  if (methodErr) return methodErr

  const apiKey = Deno.env.get('POSTHOG_PERSONAL_API_KEY')
  if (!apiKey) {
    log.error('POSTHOG_PERSONAL_API_KEY not configured')
    return json({ error: 'Server misconfigured: missing POSTHOG_PERSONAL_API_KEY' }, 500, req)
  }

  const supabase = createAdminClient()

  try {
    log.info('Fetching active issues from PostHog')
    const { results } = await listIssues(apiKey)

    let newCount = 0
    for (const issue of results) {
      const { error } = await supabase.from('posthog_errors').upsert({
        posthog_issue_id: issue.id,
        title: issue.description,
        status: issue.status,
        exception_type: issue.name,
        exception_message: issue.description,
        first_seen: issue.first_seen,
        raw_payload: issue,
      }, { onConflict: 'posthog_issue_id' })

      if (error) {
        log.error('Failed to upsert issue', { issue_id: issue.id, error: error.message })
      } else {
        newCount++
      }
    }

    const { data: poll } = await supabase.from('posthog_poll_log').insert({
      issues_synced: results.length,
      new_issues: newCount,
    }).select('id').single()

    log.info('Poll complete', { issues_synced: results.length, new_issues: newCount })

    return json({
      issues_synced: results.length,
      new_issues: newCount,
      poll_id: poll?.id,
    }, 200, req)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    log.error('Poll failed', { error: message })

    await supabase.from('posthog_poll_log').insert({
      issues_synced: 0,
      new_issues: 0,
      error_message: message,
    })

    return json({ error: message }, 500, req)
  }
})
