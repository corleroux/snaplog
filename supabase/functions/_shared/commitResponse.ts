/**
 * Shared helpers for successful commit responses.
 * Keep resource-specific payload fields explicit in each handler.
 */

import { json } from './http.ts'

export interface CommitSuccessArgs<T extends Record<string, unknown>> {
  scanSessionId: string
  idempotent: boolean
  payload: T
  req: Request
}

/**
 * Assembles a successful commit response with canonical fields.
 *
 * All commit success responses share common fields:
 * - scan_session_id: the scan session that was committed
 * - idempotent: whether this was an idempotent replay
 *
 * Resource-specific payload fields are provided by the caller and merged
 * with the common fields to produce the final JSON response.
 *
 * @param args - The response assembly arguments
 * @returns A JSON response with status 200
 */
export function commitSuccessResponse<T extends Record<string, unknown>>({
  scanSessionId,
  idempotent,
  payload,
  req,
}: CommitSuccessArgs<T>): Response {
  return json(
    {
      scan_session_id: scanSessionId,
      idempotent,
      ...payload,
    },
    200,
    req
  )
}
