export const POSTHOG_API_BASE = 'https://us.i.posthog.com'
export const POSTHOG_PROJECT_ID = '403472'

export interface PostHogIssue {
  id: string
  name: string
  description: string
  status: string
  first_seen: string
}

export interface PostHogIssueListResponse {
  results: PostHogIssue[]
  next?: string
}

export async function listIssues(
  apiKey: string,
  params?: { status?: string; limit?: number; offset?: number }
): Promise<PostHogIssueListResponse> {
  const url = new URL(`${POSTHOG_API_BASE}/api/environments/${POSTHOG_PROJECT_ID}/error_tracking/issues/`)
  if (params?.status) url.searchParams.set('status', params.status)
  if (params?.limit) url.searchParams.set('limit', String(params.limit))
  if (params?.offset) url.searchParams.set('offset', String(params.offset))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new Error(`PostHog API ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function getIssue(apiKey: string, issueId: string): Promise<PostHogIssue> {
  const res = await fetch(
    `${POSTHOG_API_BASE}/api/environments/${POSTHOG_PROJECT_ID}/error_tracking/issues/${issueId}/`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  )
  if (!res.ok) throw new Error(`PostHog API ${res.status}: ${await res.text()}`)
  return res.json()
}

export async function updateIssue(
  apiKey: string,
  issueId: string,
  data: { status?: string }
): Promise<PostHogIssue> {
  const res = await fetch(
    `${POSTHOG_API_BASE}/api/environments/${POSTHOG_PROJECT_ID}/error_tracking/issues/${issueId}/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }
  )
  if (!res.ok) throw new Error(`PostHog API ${res.status}: ${await res.text()}`)
  return res.json()
}
