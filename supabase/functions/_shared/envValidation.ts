/**
 * Shared environment validation for Supabase Edge Functions.
 *
 * Ensures all required environment variables are present and valid at function startup.
 * Call validateEnv() at the start of each edge function's main handler.
 */

interface EdgeFunctionEnv {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  GEMINI_API_KEY?: string
  MODEL_API_KEY?: string
  MUSE_SPARK_MODEL?: string
}

/**
 * Validates required environment variables for edge functions.
 * Required keys depend on the configured extraction provider.
 * @throws Error if any environment variable is missing or invalid
 * @returns Validated environment object
 */
export function validateEnv(): EdgeFunctionEnv {
  const env = Deno.env.toObject()
  const errors: string[] = []

  // Check SUPABASE_URL
  const supabaseUrl = env.SUPABASE_URL
  if (!supabaseUrl || typeof supabaseUrl !== 'string') {
    errors.push('SUPABASE_URL is required')
  } else {
    try {
      new URL(supabaseUrl)
    } catch {
      errors.push('SUPABASE_URL must be a valid URL')
    }
  }

  // Check SUPABASE_ANON_KEY
  if (!env.SUPABASE_ANON_KEY || typeof env.SUPABASE_ANON_KEY !== 'string' || env.SUPABASE_ANON_KEY.trim() === '') {
    errors.push('SUPABASE_ANON_KEY is required')
  }

  // Check SUPABASE_SERVICE_ROLE_KEY
  if (!env.SUPABASE_SERVICE_ROLE_KEY || typeof env.SUPABASE_SERVICE_ROLE_KEY !== 'string' || env.SUPABASE_SERVICE_ROLE_KEY.trim() === '') {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is required')
  }

  // Provider-specific API keys
  const provider = env.EXTRACTION_PROVIDER || 'muse-spark'

  if (provider === 'gemini') {
    if (!env.GEMINI_API_KEY || typeof env.GEMINI_API_KEY !== 'string' || env.GEMINI_API_KEY.trim() === '') {
      errors.push('GEMINI_API_KEY is required when EXTRACTION_PROVIDER=gemini')
    }
  }

  if (provider === 'muse-spark') {
    if (!env.MODEL_API_KEY || typeof env.MODEL_API_KEY !== 'string' || env.MODEL_API_KEY.trim() === '') {
      errors.push('MODEL_API_KEY is required when EXTRACTION_PROVIDER=muse-spark')
    }
  }

  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n  - ${errors.join('\n  - ')}`)
  }

  return {
    SUPABASE_URL: supabaseUrl!,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY!,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY!,
    GEMINI_API_KEY: env.GEMINI_API_KEY,
    MODEL_API_KEY: env.MODEL_API_KEY,
    MUSE_SPARK_MODEL: env.MUSE_SPARK_MODEL,
  }
}

/**
 * Type-safe accessor for validated environment variables.
 * Call validateEnv() once and use the returned object.
 */
export type { EdgeFunctionEnv }
