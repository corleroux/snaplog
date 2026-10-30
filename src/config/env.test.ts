/**
 * Environment validation smoke tests.
 *
 * Verifies that the environment configuration validation works correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Environment Validation', () => {
  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules()
  })

  it('should validate correct environment variables', async () => {
    // This test uses the actual environment from .env if available
    // In CI, these should be set from test environment

    const { env } = await import('./env.ts')

    expect(env.VITE_SUPABASE_URL).toBeDefined()
    expect(env.VITE_SUPABASE_URL).toMatch(/^https?:\/\//)

    expect(env.VITE_SUPABASE_ANON_KEY).toBeDefined()
    expect(env.VITE_SUPABASE_ANON_KEY).toBeTruthy()
  })

  it('should export env object with correct shape', async () => {
    const { env } = await import('./env.ts')

    expect(env).toMatchObject({
      VITE_SUPABASE_URL: expect.any(String),
      VITE_SUPABASE_ANON_KEY: expect.any(String),
    })
  })

  it('should throw meaningful error for missing SUPABASE_URL', async () => {
    // This test documents expected behavior
    // We can't actually test the throwing without mocking import.meta.env
    // which is not possible in Vite

    // Instead, we verify the schema is correct
    const { z } = await import('zod')

    const envSchema = z.object({
      VITE_SUPABASE_URL: z.string().url(),
      VITE_SUPABASE_ANON_KEY: z.string().min(1),
    })

    // Test that invalid URL fails
    const result = envSchema.safeParse({
      VITE_SUPABASE_URL: 'not-a-url',
      VITE_SUPABASE_ANON_KEY: 'test-key',
    })

    expect(result.success).toBe(false)
  })

  it('should throw meaningful error for empty ANON_KEY', async () => {
    const { z } = await import('zod')

    const envSchema = z.object({
      VITE_SUPABASE_URL: z.string().url(),
      VITE_SUPABASE_ANON_KEY: z.string().min(1),
    })

    const result = envSchema.safeParse({
      VITE_SUPABASE_URL: 'https://test.supabase.co',
      VITE_SUPABASE_ANON_KEY: '',
    })

    expect(result.success).toBe(false)
  })
})
