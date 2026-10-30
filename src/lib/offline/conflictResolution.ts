export interface ConflictInfo {
  hasConflict: boolean
  localUpdatedAt: string
  serverUpdatedAt: string | null
  resolution: 'local_wins' | 'server_wins' | 'no_conflict'
}

/**
 * Check for conflict between local draft and server data.
 *
 * Strategy: last-write-wins. If the local draft was modified AFTER
 * the server record was last updated, local wins. Otherwise, server wins.
 *
 * This is intentionally simple — trade fair capture is typically single-user
 * per draft, so conflicts are rare.
 */
export function detectConflict(params: {
  localUpdatedAt: string
  serverUpdatedAt: string | null
}): ConflictInfo {
  if (!params.serverUpdatedAt) {
    return {
      hasConflict: false,
      localUpdatedAt: params.localUpdatedAt,
      serverUpdatedAt: null,
      resolution: 'no_conflict',
    }
  }

  const localTime = new Date(params.localUpdatedAt).getTime()
  const serverTime = new Date(params.serverUpdatedAt).getTime()

  // If local is newer or same age, no real conflict
  if (localTime >= serverTime) {
    return {
      hasConflict: false,
      localUpdatedAt: params.localUpdatedAt,
      serverUpdatedAt: params.serverUpdatedAt,
      resolution: 'local_wins',
    }
  }

  // Server is newer — this is a genuine conflict
  return {
    hasConflict: true,
    localUpdatedAt: params.localUpdatedAt,
    serverUpdatedAt: params.serverUpdatedAt,
    resolution: 'server_wins',
  }
}
