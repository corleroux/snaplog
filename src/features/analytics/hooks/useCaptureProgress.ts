/**
 * TanStack Query hook for capture progress
 */

import { useQuery } from '@tanstack/react-query'
import { getCaptureProgress } from '../api/getCaptureProgress'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const captureProgressKeys = {
  all: ['capture-progress'] as const,
  detail: (eventId: string) => [...captureProgressKeys.all, eventId] as const,
}

// ---------------------------------------------------------------------------
// Query hook
// ---------------------------------------------------------------------------

/**
 * Fetch capture progress for a specific event with TanStack Query caching.
 *
 * staleTime: 30 sec — progress changes frequently during active capture.
 */
export function useCaptureProgress(eventId: string) {
  return useQuery({
    queryKey: captureProgressKeys.detail(eventId),
    queryFn: () => getCaptureProgress(eventId),
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds
  })
}
