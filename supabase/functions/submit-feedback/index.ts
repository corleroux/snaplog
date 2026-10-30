import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors, requireMethod, json, badRequest, unauthorized, internalError } from '../_shared/http.ts'
import { createAdminClient, requireUser } from '../_shared/supabase.ts'
import { createLogger } from '../_shared/logger.ts'
import { requireNonEmptyString } from '../_shared/validation.ts'
import { initEdgePostHog, captureEvent } from '../_shared/posthogEdge.ts'

const log = createLogger('submit-feedback')

const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_REPO = 'corleroux/tradefair'

interface FeedbackBody {
  message: string
  page_url?: string
  posthog_session_id?: string
  user_agent?: string
}

serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  const methodErr = requireMethod(req, 'POST')
  if (methodErr) return methodErr

  const { user, supabase, response: authErr } = await requireUser(req)
  if (authErr) return authErr
  if (!user || !supabase) return unauthorized()

  initEdgePostHog()

  let body: FeedbackBody
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  let message: string
  try {
    message = requireNonEmptyString(body.message, 'message')
  } catch (e) {
    return badRequest(e instanceof Error ? e.message : 'message is required')
  }

  if (message.length > 5000) {
    return badRequest('message must be 5000 characters or less')
  }

  const page_url = body.page_url ?? null
  const posthog_session_id = body.posthog_session_id ?? null
  const user_agent = body.user_agent ?? null

  // Insert feedback into database
  const adminClient = createAdminClient()
  const { data: feedback, error: insertError } = await adminClient
    .from('feedback')
    .insert({
      user_id: user.id,
      message,
      page_url,
      posthog_session_id,
      user_agent,
    })
    .select('id')
    .single()

  if (insertError) {
    log.error('Failed to insert feedback', { error: insertError.message })
    return internalError('Failed to save feedback')
  }

  // Build GitHub issue body
  const githubBody = [
    `## Feedback from ${user.email || user.id}`,
    '',
    `**User ID:** ${user.id}`,
    `**Page URL:** ${page_url || 'N/A'}`,
    `**PostHog Session ID:** ${posthog_session_id || 'N/A'}`,
    `**User Agent:** ${user_agent || 'N/A'}`,
    `**Submitted At:** ${new Date().toISOString()}`,
    `**Feedback ID:** ${feedback.id}`,
    '',
    '---',
    '',
    message,
  ].join('\n')

  // Create GitHub issue
  const githubToken = Deno.env.get('GITHUB_TOKEN')
  if (githubToken) {
    try {
      const githubRes = await fetch(`${GITHUB_API_BASE}/repos/${GITHUB_REPO}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'snaplog-feedback',
        },
        body: JSON.stringify({
          title: `[Feedback] ${message.slice(0, 80)}${message.length > 80 ? '...' : ''}`,
          body: githubBody,
          labels: ['feedback'],
        }),
      })

      if (!githubRes.ok) {
        const errText = await githubRes.text()
        log.error('GitHub issue creation failed', { status: githubRes.status, response: errText })
      }
    } catch (err) {
      log.error('GitHub API request failed', { error: err instanceof Error ? err.message : String(err) })
    }
  } else {
    log.warn('GITHUB_TOKEN not set — skipping GitHub issue creation')
  }

  // Track in PostHog
  captureEvent(user.id, 'feedback_submitted', {
    feedback_id: feedback.id,
    page_url,
    posthog_session_id,
  })

  log.info('Feedback submitted', { feedback_id: feedback.id })

  return json({ success: true, id: feedback.id }, 200, req)
})
