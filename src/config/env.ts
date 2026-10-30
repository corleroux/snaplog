import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_SENTRY_DSN: z.string().url().optional(),
  VITE_POSTHOG_KEY: z.string().min(1).optional(),
  VITE_POSTHOG_HOST: z.string().url().optional(),
})

type EnvSchema = z.infer<typeof envSchema>

function parseEnv(): EnvSchema {
  try {
    return envSchema.parse(import.meta.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .map((e: z.ZodIssue) => e.path.join('.'))
        .join(', ')
      throw new Error(
        `Missing or invalid environment variables: ${missingVars}\n\n` +
          `Please check your .env file and ensure all required variables are set.`
      )
    }
    throw error
  }
}

export const env = parseEnv()
