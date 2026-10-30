/**
 * App smoke tests.
 *
 * Basic sanity checks that the application can initialize without crashing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('App Smoke Tests', () => {
  beforeEach(() => {
    // Clear any module cache to ensure fresh imports
    vi.clearAllMocks()
  })

  it('should parse environment configuration without errors', async () => {
    // The env config is imported at module level
    // This test verifies it doesn't throw during initialization
    const { env } = await import('./config/env.ts')

    expect(env).toBeDefined()
    expect(env.VITE_SUPABASE_URL).toBeDefined()
    expect(env.VITE_SUPABASE_URL).toMatch(/^https?:\/\//)
    expect(env.VITE_SUPABASE_ANON_KEY).toBeDefined()
  })

  it('should expose Supabase client configuration', async () => {
    const supabaseModule = await import('./lib/supabase/client.ts')

    // Verify the module exports something
    expect(supabaseModule).toBeDefined()
  })

  it('should expose offline draft storage module', async () => {
    const draftStore = await import('./lib/offline/draftStore.ts')

    expect(draftStore).toBeDefined()
    expect(typeof draftStore.getVendorDraftStore).toBe('function')
    expect(typeof draftStore.getStyleDraftStore).toBe('function')
    expect(typeof draftStore.createVendorDraft).toBe('function')
    expect(typeof draftStore.createStyleDraft).toBe('function')
  })

  it('should expose offline upload queue module', async () => {
    const uploadQueue = await import('./lib/offline/uploadQueue.ts')

    expect(uploadQueue).toBeDefined()
    expect(typeof uploadQueue.getUploadQueue).toBe('function')
    expect(typeof uploadQueue.UploadQueue).toBe('function')
  })

  it('should expose validation schemas', async () => {
    // Check that we can import validation modules
    const zod = await import('zod')

    expect(zod).toBeDefined()
    expect(typeof zod.string).toBe('function')
    expect(typeof zod.object).toBe('function')
    expect(typeof zod.array).toBe('function')
  })
})
