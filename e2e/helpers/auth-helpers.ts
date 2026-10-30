/**
 * Authentication Helpers
 *
 * Helper functions for authentication operations in E2E tests:
 * - Login/logout via UI
 * - Session management
 * - Role switching
 * - Token handling
 */

import { type Page, type BrowserContext } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Test credentials from environment
const TEST_USER = {
  email: process.env.E2E_USER_EMAIL || 'e2e-test@example.com',
  password: process.env.E2E_USER_PASSWORD || 'test-password-e2e',
}

/**
 * Log in via UI and wait for redirect to events
 */
export async function login(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /log in|sign in/i }).click()
  await page.waitForURL('**/events**', { timeout: 15_000 })
}

/**
 * Log out via UI
 */
export async function logout(page: Page) {
  // Look for logout button (might be in menu or directly accessible)
  const logoutButton = page.getByRole('button', { name: /logout|sign.*out|log.*out/i })
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click()
  } else {
    // Try to open user menu first
    const menuButton = page.getByRole('button', { name: /menu|account|user/i })
    if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuButton.click()
      await logoutButton.click()
    }
  }
  await page.waitForURL('**/login**', { timeout: 10_000 })
}

/**
 * Log in via API (bypasses UI, faster)
 * Returns the session access token
 */
export async function loginViaAPI(supabaseUrl: string, supabaseKey: string, email = TEST_USER.email, password = TEST_USER.password): Promise<string | null> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Login via API failed:', error.message)
    return null
  }

  return data.session?.access_token || null
}

/**
 * Set authentication token in browser storage
 * Use with loginViaAPI to skip UI login
 */
export async function setAuthToken(context: BrowserContext, token: string) {
  await context.addInitScript(`
    localStorage.setItem('sb-access-token', '${token}');
    localStorage.setItem('sb-refresh-token', '${token}');
  `)
}

/**
 * Clear all auth tokens from storage
 */
export async function clearAuth(page: Page) {
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

/**
 * Get current auth status from page
 */
export async function getAuthStatus(page: Page): Promise<boolean> {
  const isLoggedIn = await page.evaluate(() => {
    const token = localStorage.getItem('sb-access-token')
    return !!token
  })
  return isLoggedIn
}

/**
 * Create a test user via API (if it doesn't exist)
 */
export async function createTestUser(supabaseUrl: string, supabaseServiceKey: string, email = TEST_USER.email, password = TEST_USER.password): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // First try to sign up
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    if (error.message.includes('already been registered')) {
      // User already exists, that's fine
      return true
    }
    console.error('Create test user failed:', error.message)
    return false
  }

  return true
}

/**
 * Switch user role for an event (admin/editor/viewer)
 * Requires admin privileges
 */
export async function setEventRole(supabaseUrl: string, supabaseServiceKey: string, userId: string, eventId: string, role: 'admin' | 'editor' | 'viewer'): Promise<boolean> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error } = await supabase
    .from('event_members')
    .upsert({
      user_id: userId,
      event_id: eventId,
      role,
    })

  if (error) {
    console.error('Set event role failed:', error.message)
    return false
  }

  return true
}

/**
 * Get user ID from email
 */
export async function getUserId(supabaseUrl: string, supabaseServiceKey: string, email = TEST_USER.email): Promise<string | null> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (error || !data) {
    return null
  }

  return data.id
}
