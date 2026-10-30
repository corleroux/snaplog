/**
 * TanStack Query hook for extraction quality
 */

import { useQuery } from '@tanstack/react-query'
import { getExtractionQuality } from '../api/getExtractionQuality'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const extractionQualityKeys = {
  all: ['extraction-quality'] as const,
  detail: (eventId: string) => [...extractionQualityKeys.all, eventId] as const,
}

// ---------------------------------------------------------------------------
// Query hook
// ---------------------------------------------------------------------------

/**
 * Fetch extraction quality for a specific event with TanStack Query caching.
 *
 * staleTime: 2 min — quality metrics change infrequently.
 */
export function useExtractionQuality(eventId: string) {
  return useQuery({
    queryKey: extractionQualityKeys.detail(eventId),
    queryFn: () => getExtractionQuality(eventId),
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
