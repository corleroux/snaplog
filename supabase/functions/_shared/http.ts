/**
 * Shared HTTP utilities for Supabase Edge Functions
 *
 * Provides canonical CORS, JSON response, method validation, and error-response helpers.
 * CORS is restricted to origins listed in the ALLOWED_ORIGINS env var.
 */

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

function getAllowOrigin(req: Request): string | null {
  const origin = req.headers.get('Origin')
  if (!origin) return null
  return ALLOWED_ORIGINS.includes(origin) ? origin : null
}

export function corsHeaders(req: Request): Record<string, string> {
  const allowOrigin = getAllowOrigin(req)
  return {
    'Access-Control-Allow-Origin': allowOrigin ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

export function json(data: unknown, status = 200, req?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...(req ? corsHeaders(req) : {}),
      'Content-Type': 'application/json',
    },
  })
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const allowOrigin = getAllowOrigin(req)
    return new Response(null, {
      status: allowOrigin ? 204 : 403,
      headers: corsHeaders(req),
    })
  }
  return null
}

export function requireMethod(req: Request, method: string): Response | null {
  if (req.method !== method) {
    return methodNotAllowed(req)
  }
  return null
}

/**
 * Shared JSON error-response helpers.
 * Keep error selection and control flow explicit in handlers.
 */

export function badRequest(message: string, error = 'Bad request', req?: Request): Response {
  return json({ error, message }, 400, req)
}

export function unauthorized(message = 'User not authenticated', req?: Request): Response {
  return json({ error: 'Unauthorized', message }, 401, req)
}

export function forbidden(message: string, req?: Request): Response {
  return json({ error: 'Forbidden', message }, 403, req)
}

export function notFound(message: string, error = 'Not found', req?: Request): Response {
  return json({ error, message }, 404, req)
}

export function conflict(message: string, error = 'Conflict', req?: Request): Response {
  return json({ error, message }, 409, req)
}

export function internalError(message: string, error = 'Internal server error', req?: Request): Response {
  return json({ error, message }, 500, req)
}

export function methodNotAllowed(req?: Request): Response {
  return json({ error: 'Method not allowed' }, 405, req)
}
