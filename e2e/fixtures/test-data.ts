/**
 * E2E test fixtures and shared utilities.
 *
 * These helpers provide consistent test data and page interactions
 * for all E2E test files.
 */

import { type Page, type BrowserContext, expect } from '@playwright/test'

/**
 * Test credentials (must match staging environment)
 *
 * Staging environment: sqshnzkgqdoiocnaunpu.supabase.co (shared project)
 */
export const TEST_USER = {
  email: process.env.E2E_USER_EMAIL || 'e2e-test@example.com',
  password: process.env.E2E_USER_PASSWORD || 'TestPassword123!',
}

/**
 * Staging configuration
 */
export const STAGING_CONFIG = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'https://sqshnzkgqdoiocnaunpu.supabase.co',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
}

/**
 * Helper to log in via the UI.
 * Navigates to the login page and submits credentials.
 */
export async function login(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  // Navigate first, then clear storage
  await page.goto('/login', { waitUntil: 'domcontentloaded' })

  // Clear storage after page is loaded
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /log in|sign in/i }).click()

  // Wait for redirect to events dashboard (root route / or /events)
  await page.waitForURL(/\/(events|)$/, { timeout: 15_000 })
}

/**
 * Helper to log out via UI
 */
export async function logout(page: Page) {
  const logoutButton = page.getByRole('button', { name: /logout|sign.*out/i })
  if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await logoutButton.click()
  } else {
    // Try to open menu first
    const menuButton = page.getByRole('button', { name: /menu|account|user/i })
    if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await menuButton.click()
      await logoutButton.click()
    }
  }
  await page.waitForURL('**/login**', { timeout: 10_000 })
}

/**
 * Helper to create a test event via the UI.
 * Returns the event name used for later assertions.
 * If an event already exists, navigates to it instead.
 */
export async function createTestEvent(page: Page): Promise<string> {
  const eventName = `E2E Test Event ${Date.now()}`

  // Check if there are existing events we can use
  const existingEvent = page.getByRole('button', { name: /test|event/i }).first()
  if (await existingEvent.isVisible().catch(() => false)) {
    await existingEvent.click()
    return eventName
  }

  // Create a new event
  const createButton = page.getByRole('button', { name: /create|new|add.*event/i })
  if (await createButton.isVisible().catch(() => false)) {
    await createButton.click()
    const nameInput = page.getByLabel(/event name|name/i)
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(eventName)
    }
    await page.getByRole('button', { name: /create|save/i }).click()
  }

  return eventName
}

/**
 * Simulate offline mode by cutting network.
 */
export async function goOffline(context: BrowserContext) {
  await context.setOffline(true)
}

/**
 * Restore online mode.
 */
export async function goOnline(context: BrowserContext) {
  await context.setOffline(false)
}

/**
 * Wait for the app to reach a stable state (no loading spinners).
 */
export async function waitForAppReady(page: Page, timeout = 30000) {
  // Wait for any loading indicators to disappear
  const loadingSpinners = page.getByTestId('loading').or(
    page.locator('[aria-busy="true"]')
  ).or(page.locator('.spinner, .animate-spin'))

  if (await loadingSpinners.isVisible().catch(() => false)) {
    await loadingSpinners.first().waitFor({ state: 'hidden', timeout })
  }

  // Wait for network to be mostly idle
  await page.waitForLoadState('domcontentloaded').catch(() => {})
}

/**
 * Generate a timestamped test name
 */
export function generateTestName(prefix: string): string {
  return `${prefix} ${Date.now()}`
}

/**
 * Generate a random test email
 */
export function generateTestEmail(): string {
  return `e2e-test-${Date.now()}@example.com`
}

/**
 * Network simulation helpers
 */
export const networkSimulation = {
  /**
   * Simulate slow 3G connection
   */
  async slow3G(page: Page) {
    await page.route('**/*', async (route) => {
      // Add delay to simulate slow network
      await new Promise(resolve => setTimeout(resolve, 500))
      route.continue()
    })
  },

  /**
   * Simulate fast 4G connection
   */
  async fast4G(page: Page) {
    await page.route('**/*', async (route) => {
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50))
      route.continue()
    })
  },

  /**
   * Simulate offline mode
   */
  async offline(page: Page) {
    await page.route('**/*', route => route.abort('failed'))
  },

  /**
   * Restore normal network
   */
  async restore(page: Page) {
    // Unroute all handlers
    const routes = page.context().routes()
    for (const route of routes) {
      await page.unroute(route)
    }
  },
}

/**
 * Wait for and verify an element is visible
 */
export async function waitForVisible(page: Page, selector: string, timeout = 10000) {
  await expect(page.locator(selector)).toBeVisible({ timeout })
}

/**
 * Wait for and verify an element is hidden
 */
export async function waitForHidden(page: Page, selector: string, timeout = 10000) {
  await expect(page.locator(selector)).not.toBeVisible({ timeout })
}

/**
 * Take a screenshot for debugging
 */
export async function debugScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/debug-${name}-${Date.now()}.png`,
    fullPage: true
  })
}

/**
 * Get current URL path without domain
 */
export function getCurrentPath(page: Page): string {
  return new URL(page.url()).pathname
}

/**
 * Assert current URL matches a pattern
 */
export async function assertUrl(page: Page, pattern: RegExp | string) {
  await expect(page).toHaveURL(pattern)
}

/**
 * Test data factory functions
 */
export const testDataFactory = {
  /**
   * Create test event data
   */
  event(overrides?: Partial<{ name: string; description: string; location: string }>) {
    return {
      name: overrides?.name || generateTestName('Event'),
      description: overrides?.description || 'E2E test event description',
      location: overrides?.location || 'Test Location',
    }
  },

  /**
   * Create test vendor data
   */
  vendor(overrides?: Partial<{ company: string; booth: string; email: string }>) {
    return {
      company: overrides?.company || generateTestName('Vendor'),
      booth: overrides?.booth || 'A123',
      email: overrides?.email || generateTestEmail(),
    }
  },

  /**
   * Create test style data
   */
  style(overrides?: Partial<{ name: string; category: string; season: string }>) {
    return {
      name: overrides?.name || generateTestName('Style'),
      category: overrides?.category || 'Test Category',
      season: overrides?.season || 'SS26',
    }
  },
}

/**
 * Reusable test data sets
 */
export const sampleData = {
  /**
   * Sample vendor business card image path
   */
  vendorCardImage: 'fixtures/assets/sample-vendor-card.jpg',

  /**
   * Sample fabric swatch image path
   */
  fabricSwatchImage: 'fixtures/assets/sample-fabric-swatch.jpg',

  /**
   * Sample product tag image path
   */
  productTagImage: 'fixtures/assets/sample-product-tag.jpg',
}

/**
 * Assertion helpers
 */
export const assertions = {
  /**
   * Assert no error messages are visible
   */
  async noError(page: Page) {
    const errorElements = page.getByRole('alert').or(page.getByText(/error|failed|cannot/i))
    const count = await errorElements.count()
    expect(count).toBe(0)
  },

  /**
   * Assert success message is visible
   */
  async success(page: Page, message?: RegExp) {
    const successElement = page.getByText(/success|saved|created|updated/i)
    if (message) {
      await expect(page.getByText(message)).toBeVisible()
    } else {
      await expect(successElement).toBeVisible()
    }
  },

  /**
   * Assert loading indicator is visible
   */
  async loading(page: Page) {
    const loading = page.getByTestId('loading').or(page.locator('.spinner, [aria-busy="true"]'))
    await expect(loading.first()).toBeVisible()
  },

  /**
   * Assert loading indicator is hidden
   */
  async notLoading(page: Page) {
    const loading = page.getByTestId('loading').or(page.locator('.spinner, [aria-busy="true"]'))
    await expect(loading.first()).not.toBeVisible({ timeout: 30000 })
  },
}

/**
 * Device simulation helpers
 */
export const deviceSimulation = {
  /**
   * Simulate mobile viewport
   */
  async mobile(page: Page) {
    await page.setViewportSize({ width: 375, height: 667 })
  },

  /**
   * Simulate tablet viewport
   */
  async tablet(page: Page) {
    await page.setViewportSize({ width: 768, height: 1024 })
  },

  /**
   * Simulate desktop viewport
   */
  async desktop(page: Page) {
    await page.setViewportSize({ width: 1920, height: 1080 })
  },
}
