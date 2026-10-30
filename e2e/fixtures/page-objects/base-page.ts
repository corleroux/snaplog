/**
 * Base Page Object Model
 *
 * Provides common selectors and methods used across all pages.
 * Extend this class in specific page objects to inherit shared functionality.
 */

import { type Page, expect, Locator } from '@playwright/test'

export class BasePage {
  readonly page: Page

  // Common selectors
  readonly loadingSpinner: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator
  readonly offlineIndicator: Locator
  readonly appHeader: Locator
  readonly backButton: Locator

  constructor(page: Page) {
    this.page = page

    // Loading states
    this.loadingSpinner = page.getByTestId('loading').or(
      page.locator('[aria-busy="true"]')
    ).or(page.locator('.spinner, .animate-spin'))

    // Error and success messages
    this.errorMessage = page.getByRole('alert').or(page.getByText(/error|failed|cannot/i))
    this.successMessage = page.getByText(/success|saved|created|updated/i)

    // Offline indicator
    this.offlineIndicator = page.getByText(/offline|no connection|you're offline/i)

    // App header
    this.appHeader = page.locator('header').first()
    this.backButton = page.getByRole('button', { name: /back|←/ })
  }

  /**
   * Navigate to a URL path
   */
  async goto(path: string) {
    await this.page.goto(path)
  }

  /**
   * Wait for the app to be ready (no loading spinners)
   */
  async waitForReady(timeout = 30000) {
    try {
      await this.loadingSpinner.first().waitFor({ state: 'hidden', timeout })
    } catch {
      // No spinner found, that's fine
    }
    // Wait for network to be mostly idle
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Wait for and verify no error messages are visible
   */
  async assertNoError() {
    await expect(this.errorMessage).not.toBeVisible()
  }

  /**
   * Take a screenshot on failure (for debugging)
   */
  async screenshotOnFailure(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true
    })
  }

  /**
   * Click a button and wait for navigation/stability
   */
  async clickAndWait(button: Locator, waitForLoadState = true) {
    await button.click()
    if (waitForLoadState) {
      await this.page.waitForLoadState('domcontentloaded')
      await this.waitForReady()
    }
  }

  /**
   * Fill an input and verify it was filled
   */
  async fillInput(input: Locator, value: string) {
    await input.fill(value)
    await expect(input).toHaveValue(value)
  }

  /**
   * Get current URL path (without domain)
   */
  getCurrentPath(): string {
    return new URL(this.page.url()).pathname
  }

  /**
   * Assert current URL matches a pattern
   */
  async assertUrl(pattern: RegExp | string) {
    await expect(this.page).toHaveURL(pattern)
  }
}
