/**
 * Shared Gemini API client with timeout and retry.
 *
 * Usage:
 *   const result = await callGeminiWithRetry(imageBase64, mimeType, prompt)
 */

// Timeout: 30 seconds
const GEMINI_TIMEOUT_MS = 30000

// Retry: 2 retries with exponential backoff (5s, 15s)
const MAX_RETRIES = 2
const BASE_RETRY_DELAY_MS = 5000

// Retryable HTTP status codes and error patterns
const RETRYABLE_ERROR_PATTERNS = [
  'econnreset',
  'etimedout',
  'enotfound',
  'connection reset',
  'connection timeout',
  'network',
  'fetch failed',
]

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return RETRYABLE_ERROR_PATTERNS.some(p => msg.includes(p))
}

async function withTimeout<T>(
  promise: (signal: AbortSignal) => Promise<T>,
  ms: number,
  message: string
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)

  try {
    return await promise(controller.signal)
  } catch (err) {
    if (controller.signal.aborted) throw new Error(message)
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Call the Gemini API with timeout and retry.
 *
 * @param url Full Gemini API URL with key
 * @param body Request body (already serialized config)
 * @returns Parsed JSON response from Gemini
 */
export async function callGeminiWithRetry(
  url: string,
  body: Record<string, unknown>
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await withTimeout(
        (signal) => fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        }),
        GEMINI_TIMEOUT_MS,
        `Gemini API request timed out after ${GEMINI_TIMEOUT_MS}ms`
      )

      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Don't retry on last attempt
      if (attempt === MAX_RETRIES) break

      // Only retry transient errors (network, timeout)
      if (!isRetryableError(err)) throw err

      // Exponential backoff: 5s, 15s
      const delay = BASE_RETRY_DELAY_MS * Math.pow(3, attempt)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Build the full Gemini API URL with the API key.
 */
export function getGeminiUrl(apiKey: string): string {
  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-lite-latest'
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
}
