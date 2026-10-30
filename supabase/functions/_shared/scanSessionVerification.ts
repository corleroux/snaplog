/**
 * Shared authenticated scan_session lookup + ownership/event verification
 * for commit flows.
 */

import { json } from './http.ts'

export interface VerifyScanSessionArgs {
  supabase: any
  scanSessionId: string
  eventId: string
  userId: string
  select: string
  req: Request
}

export interface VerifyScanSessionResult<T> {
  scanSession: T | null
  response: Response | null
}

/**
 * Fetches and verifies a scan session belongs to the authenticated user
 * and matches the expected event_id.
 *
 * Returns either:
 * - { scanSession: T, response: null } on successful verification
 * - { scanSession: null, response: Response } for 404/403/409 errors
 *
 * The returned scanSession will always include `created_by` and `event_id` fields.
 * Callers must include these in their select clause.
 */
export async function verifyOwnedScanSession<T>({
  supabase,
  scanSessionId,
  eventId,
  userId,
  select,
  req,
}: VerifyScanSessionArgs): Promise<VerifyScanSessionResult<T>> {
  const { data, error } = await supabase
    .from('scan_sessions')
    .select(select)
    .eq('id', scanSessionId)
    .single()

  if (error || !data) {
    return {
      scanSession: null,
      response: json(
        {
          error: 'Not found',
          message: 'Scan session not found',
        },
        404,
        req
      ),
    }
  }

  const scanSession = data as T & {
    created_by: string
    event_id: string
  }

  if (scanSession.created_by !== userId) {
    return {
      scanSession: null,
      response: json(
        {
          error: 'Forbidden',
          message: 'You do not have permission to commit this scan session',
        },
        403,
        req
      ),
    }
  }

  if (scanSession.event_id !== eventId) {
    return {
      scanSession: null,
      response: json(
        {
          error: 'Conflict',
          message: 'event_id does not match scan session',
        },
        409,
        req
      ),
    }
  }

  return {
    scanSession,
    response: null,
  }
}
