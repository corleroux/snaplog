/**
 * Rate Limiting for Supabase Edge Functions
 *
 * Provides in-memory rate limiting using a sliding window approach.
 * Since Supabase Edge Functions don't have persistent storage between
 * invocations, each function instance maintains its own counter.
 *
 * For production use with multiple instances, consider:
 * - Supabase database-backed rate limiting table
 * - External Redis service
 * - Supabase Realtime for distributed state
 *
 * Current implementation: In-memory with automatic cleanup
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests: number // Max requests per window
  keyPrefix?: string // Prefix for rate limit keys
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
  retryAfter?: number // Seconds until retry (if not allowed)
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'Retry-After'?: string
}

// ============================================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================================

export const RATE_LIMITS = {
  // Authenticated users: higher limits
  authenticated: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'auth',
  },

  // Anonymous users: lower limits
  anonymous: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'anon',
  },

  // API endpoints: moderate limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
    keyPrefix: 'api',
  },

  // Extraction endpoints: conservative limits
  extraction: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'extract',
  },

  // Public endpoints: very conservative
  public: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5,
    keyPrefix: 'public',
  },
} as const

// ============================================================================
// IN-MEMORY RATE LIMIT STORAGE
// ============================================================================

interface RateLimitEntry {
  count: number
  windowStart: number
  lastSeen: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup entries older than 2x the window size to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
let cleanupTimer: ReturnType<typeof setTimeout> | null = null

function startCleanupTimer() {
  if (cleanupTimer) return

  cleanupTimer = setTimeout(() => {
    const now = Date.now()
    const maxAge = 2 * 60 * 1000 // 2 minutes (covers all windows)

    for (const [key, entry] of rateLimitStore.entries()) {
      if (now - entry.lastSeen > maxAge) {
        rateLimitStore.delete(key)
      }
    }

    cleanupTimer = null
    startCleanupTimer() // Schedule next cleanup
  }, CLEANUP_INTERVAL)
}

// Start cleanup on module load
startCleanupTimer()

// ============================================================================
// RATE LIMIT FUNCTIONS
// ============================================================================

/**
 * Check if a request should be rate limited based on user ID or IP.
 *
 * @param identifier - User ID (for authenticated) or IP address (for anonymous)
 * @param config - Rate limit configuration
 * @returns Rate limit result with headers
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMITS.anonymous
): RateLimitResult {
  const now = Date.now()
  const key = `${config.keyPrefix || 'default'}:${identifier}`
  const windowMs = config.windowMs || 60000
  const maxRequests = config.maxRequests || 10

  // Get or create entry
  let entry = rateLimitStore.get(key)

  if (!entry) {
    // First request
    entry = {
      count: 1,
      windowStart: now,
      lastSeen: now,
    }
    rateLimitStore.set(key, entry)

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetAt: new Date(now + windowMs),
    }
  }

  // Check if window has expired
  const windowElapsed = now - entry.windowStart

  if (windowElapsed >= windowMs) {
    // New window - reset count
    entry.count = 1
    entry.windowStart = now
    entry.lastSeen = now

    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetAt: new Date(now + windowMs),
    }
  }

  // Within current window - check limit
  entry.lastSeen = now

  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    const resetAt = entry.windowStart + windowMs
    const retryAfter = Math.ceil((resetAt - now) / 1000)

    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: new Date(resetAt),
      retryAfter,
    }
  }

  // Increment count and allow
  entry.count++

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetAt: new Date(entry.windowStart + windowMs),
  }
}

/**
 * Extract rate limit headers from result for HTTP response.
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
  }

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter)
  }

  return headers
}

/**
 * Get client IP address from request headers.
 * Handles various proxy configurations (Vercel, Cloudflare, etc.)
 */
export function getClientIp(req: Request): string {
  // Try various headers in order of preference
  const headers = req.headers

  // Cloudflare
  const cfConnectingIp = headers.get('CF-Connecting-IP')
  if (cfConnectingIp) return cfConnectingIp

  // Vercel
  const xForwardedFor = headers.get('X-Forwarded-For')
  if (xForwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = xForwardedFor.split(',').map((ip) => ip.trim())
    return ips[0] || 'unknown'
  }

  // Standard proxy headers
  const xRealIp = headers.get('X-Real-IP')
  if (xRealIp) return xRealIp

  // Fallback
  return 'unknown'
}

/**
 * Check rate limit for authenticated user.
 */
export function checkAuthRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(userId, RATE_LIMITS.authenticated)
}

/**
 * Check rate limit for anonymous user by IP.
 */
export function checkAnonymousRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(ip, RATE_LIMITS.anonymous)
}

/**
 * Middleware function to apply rate limiting to an edge function.
 *
 * Usage:
 * ```ts
 * import { rateLimitMiddleware } from '../_shared/rateLimit'
 *
 * serve(async (req) => {
 *   const rateLimitResult = rateLimitMiddleware(req)
 *   if (!rateLimitResult.allowed) {
 *     return rateLimitResponse(rateLimitResult)
 *   }
 *
 *   // ... your handler code
 * })
 * ```
 */
export function rateLimitMiddleware(
  req: Request,
  userId?: string | null
): RateLimitResult {
  if (userId) {
    return checkAuthRateLimit(userId)
  }

  const ip = getClientIp(req)
  return checkAnonymousRateLimit(ip)
}

/**
 * Create a rate limit exceeded response.
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        ...getRateLimitHeaders(result),
      },
    }
  )
}

/**
 * Apply rate limit headers to a response.
 */
export function applyRateLimitHeaders(
  response: Response,
  result: RateLimitResult
): Response {
  const headers = getRateLimitHeaders(result)

  // Create new response with added headers
  const newHeaders = new Headers(response.headers)
  for (const [key, value] of Object.entries(headers)) {
    newHeaders.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
