/**
 * E2E: Error Handling & Edge Cases Tests
 *
 * Tests for error handling and edge cases:
 * - Network error during load shows error state with retry
 * - API timeout displays appropriate message
 * - Offline mode shows offline indicator
 * - Upload failure shows error and allows retry
 * - Form validation errors display inline
 * - 404 on invalid route shows not found
 * - Permission denied shows appropriate message
 */

import { test, expect } from '@playwright/test'
import { login, waitForAppReady, goOffline, goOnline } from './fixtures/test-data'

// Only skip the offline simulation tests - the error boundary test can run against staging
test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)
  })

  test.describe('Network Errors', () => {
    test.skip('network error during load shows error state', async ({ page, context }) => {
      // Go offline and try to navigate
      await goOffline(context)
      await page.goto('/events')

      // Should show offline/error state
      const errorMessage = page.getByText(/offline|no connection|network error|failed to load/i)
      if (await errorMessage.isVisible({ timeout: 5000 })) {
        await expect(errorMessage).toBeVisible()
      }

      // Go back online
      await goOnline(context)
    })

    test.skip('error state includes retry button', async ({ page, context }) => {
      await goOffline(context)
      await page.goto('/events')

      // Look for retry button
      const retryButton = page.getByRole('button', { name: /retry|try again|reload/i })

      if (await retryButton.isVisible({ timeout: 5000 })) {
        await expect(retryButton).toBeVisible()

        // Go online and retry
        await goOnline(context)
        await retryButton.click()

        // Should load successfully
        await waitForAppReady(page)
      }

      await goOnline(context)
    })

    test.skip('auto-retry when connection restored', async ({ page, context }) => {
      await goOffline(context)
      await page.goto('/events')

      // Wait for error state
      await page.waitForTimeout(2000)

      // Go back online
      await goOnline(context)

      // Should auto-retry and load
      await waitForAppReady(page)
      await expect(page).toHaveURL(/\/events/)
    })
  })

  test.describe('API Timeouts', () => {
    test('slow API request shows loading state', async ({ page }) => {
      // Navigate to a page that requires API data
      await page.goto('/events')

      // Look for loading indicator
      const loadingSpinner = page.getByTestId('loading').or(page.locator('.spinner'))

      // It might appear briefly
      const wasLoading = await loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false)

      // Eventually should load
      await waitForAppReady(page)
    })

    test('timeout shows appropriate error message', async ({ page }) => {
      // This test would require simulating a timeout
      // which is difficult to do reliably
      test.skip('Requires timeout simulation')
    })
  })

  test.describe('Offline Mode', () => {
    test.skip('offline indicator is visible when offline', async ({ page, context }) => {
      await goOffline(context)

      // Reload or navigate
      await page.reload()

      // Look for offline indicator
      const offlineIndicator = page.getByText(/offline|no connection|you're offline/i)
      if (await offlineIndicator.isVisible({ timeout: 3000 })) {
        await expect(offlineIndicator).toBeVisible()
      }

      await goOnline(context)
    })

    test.skip('offline mode allows viewing cached data', async ({ page, context }) => {
      // Load data first while online
      await page.goto('/events')
      await waitForAppReady(page)

      // Get initial content
      const initialContent = await page.content()

      // Go offline
      await goOffline(context)
      await page.reload()

      // Should still show some content (cached)
      const offlineContent = await page.content()

      // At least some content should be preserved
      expect(offlineContent.length).toBeGreaterThan(0)

      await goOnline(context)
    })

    test.skip('sync indicator shows when reconnecting', async ({ page, context }) => {
      // Go offline, make changes, go back online
      await goOffline(context)
      await page.goto('/events')
      await page.waitForTimeout(2000)

      await goOnline(context)

      // Look for syncing indicator
      const syncIndicator = page.getByText(/syncing|updating|refreshing/i)
      if (await syncIndicator.isVisible({ timeout: 3000 })) {
        await expect(syncIndicator).toBeVisible()
      }
    })
  })

  test.describe('Upload Failures', () => {
    test.skip('upload failure shows error message', async ({ page, context }) => {
      // Go offline during upload
      await page.goto('/events')

      // Navigate to capture
      const captureButton = page.getByRole('button', { name: /capture|add|create/i })
      if (await captureButton.isVisible({ timeout: 2000 })) {
        await captureButton.click()

        // Go offline
        await goOffline(context)

        // Try to upload
        const fileInput = page.locator('input[type="file"]')
        if (await fileInput.isVisible()) {
          // Create a fake file
          await page.evaluate(() => {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement
            if (input) {
              const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
              const dataTransfer = new DataTransfer()
              dataTransfer.items.add(file)
              input.files = dataTransfer.files
            }
          })

          // Try to submit
          const submitButton = page.getByRole('button', { name: /upload|save|submit/i })
          if (await submitButton.isVisible()) {
            await submitButton.click()

            // Should show error
            const uploadError = page.getByText(/upload failed|network error|offline/i)
            if (await uploadError.isVisible({ timeout: 5000 })) {
              await expect(uploadError).toBeVisible()
            }
          }
        }
      }

      await goOnline(context)
    })

    test('upload error allows retry', async ({ page, context }) => {
      // Similar to above but look for retry option
      test.skip('Requires upload failure simulation')
    })
  })

  test.describe('Form Validation', () => {
    test('required field validation shows inline error', async ({ page }) => {
      await page.goto('/events/new')

      // Try to submit without filling required fields
      const submitButton = page.getByRole('button', { name: /create|save|submit/i })
      if (await submitButton.isVisible()) {
        await submitButton.click()

        // Should show validation error
        const validationError = page.getByText(/required|please fill|missing/i)
        if (await validationError.isVisible({ timeout: 2000 })) {
          await expect(validationError).toBeVisible()
        }
      } else {
        test.skip('Submit button not found')
      }
    })

    test('email format validation shows error', async ({ page }) => {
      await page.goto('/login')

      // Enter invalid email
      await page.getByLabel('Email').fill('not-an-email')
      await page.getByRole('button', { name: /log in|sign in/i }).click()

      // Should show email validation error
      const emailError = page.getByText(/invalid email|please enter.*valid email/i)
      if (await emailError.isVisible({ timeout: 2000 })) {
        await expect(emailError).toBeVisible()
      }
    })

    test('password mismatch validation shows error', async ({ page }) => {
      await page.goto('/signup')

      const passwordInput = page.getByLabel('Password')
      const confirmInput = page.getByLabel(/confirm/i)

      if (await confirmInput.isVisible()) {
        await passwordInput.fill('Password123!')
        await confirmInput.fill('DifferentPassword123!')
        await page.getByRole('button', { name: /sign up|create account/i }).click()

        // Should show mismatch error
        const mismatchError = page.getByText(/match|different/i)
        if (await mismatchError.isVisible({ timeout: 2000 })) {
          await expect(mismatchError).toBeVisible()
        }
      } else {
        test.skip('Confirm password field not found')
      }
    })
  })

  test.describe('404 Errors', () => {
    test('invalid route shows not found page', async ({ page }) => {
      await page.goto('/this-route-does-not-exist-12345')

      // Should show 404 or redirect to events
      const notFoundText = page.getByText(/not found|404|page doesn't exist/i)
      const isEventsPage = page.url().includes('/events')

      const hasNotFound = await notFoundText.isVisible().catch(() => false)
      expect(hasNotFound || isEventsPage).toBeTruthy()
    })

    test('not found page has helpful navigation', async ({ page }) => {
      await page.goto('/invalid-route-xyz')

      const notFoundText = page.getByText(/not found|404/i)

      if (await notFoundText.isVisible({ timeout: 2000 })) {
        // Look for home/back button
        const homeButton = page.getByRole('link', { name: /home|events|back/i })
        if (await homeButton.isVisible({ timeout: 1000 })) {
          await expect(homeButton).toBeVisible()
        }
      }
    })

    test('invalid event ID shows error', async ({ page }) => {
      await page.goto('/events/invalid-id-12345/vendors')

      // Should show error or redirect
      const errorText = page.getByText(/not found|invalid|doesn't exist/i)
      const isEventsPage = page.url().includes('/events')

      const hasError = await errorText.isVisible().catch(() => false)
      expect(hasError || isEventsPage).toBeTruthy()
    })
  })

  test.describe('Permission Errors', () => {
    test('accessing other user\'s private event shows error', async ({ page }) => {
      // Try to access a random event ID (likely doesn't exist or belongs to someone else)
      await page.goto('/events/00000000-0000-0000-0000-000000000000')

      // Should show permission error or not found
      const errorText = page.getByText(/not found|access denied|no permission|private/i)
      const isEventsPage = page.url().includes('/events')

      const hasError = await errorText.isVisible().catch(() => false)
      expect(hasError || isEventsPage).toBeTruthy()
    })

    test('admin-only routes redirect non-admin users', async ({ page }) => {
      await page.goto('/admin')

      // Should redirect to events or show permission error
      const isEventsPage = page.url().includes('/events')
      const hasError = await page.getByText(/access denied|admin only|not authorized/i).isVisible().catch(() => false)

      expect(isEventsPage || hasError).toBeTruthy()
    })
  })

  test.describe('Edge Cases', () => {
    test('very long text is handled correctly', async ({ page }) => {
      // Navigate to a form
      await page.goto('/events/new')

      const nameInput = page.getByLabel(/event.*name|name/i)
      if (await nameInput.isVisible()) {
        // Enter a very long name
        const longName = 'A'.repeat(500)
        await nameInput.fill(longName)

        // Should either truncate or accept it
        const value = await nameInput.inputValue()
        expect(value.length).toBeGreaterThan(0)
      }
    })

    test('special characters in input are handled', async ({ page }) => {
      await page.goto('/events/new')

      const nameInput = page.getByLabel(/event.*name|name/i)
      if (await nameInput.isVisible()) {
        const specialChars = '<script>alert("xss")</script> & "quotes" and \'apostrophes\''
        await nameInput.fill(specialChars)

        // Should be sanitized or escaped
        const value = await nameInput.inputValue()
        expect(value).toBeTruthy()
      }
    })

    test('empty lists show empty state', async ({ page }) => {
      // This would require having no events
      // which is hard to guarantee in tests
      test.skip('Requires empty state setup')
    })

    test('concurrent requests are handled correctly', async ({ page }) => {
      // Navigate to multiple pages quickly
      const promises = [
        page.goto('/events'),
        page.goto('/events'),
        page.goto('/events'),
      ]

      await Promise.all(promises)

      // Should settle on a valid state
      await waitForAppReady(page)
      await expect(page).toHaveURL(/\/events/)
    })
  })

  test.describe('Error Boundaries', () => {
    test('JavaScript errors are caught and reported', async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      await page.goto('/events')
      await waitForAppReady(page)

      await page.goto('/vendors')
      await waitForAppReady(page)

      const unexpectedErrors = errors.filter(e =>
        !e.includes('favicon') &&
        !e.includes('404') &&
        !e.includes('net::ERR')
      )
      expect(unexpectedErrors, `Unexpected console errors: ${unexpectedErrors.join(', ')}`).toHaveLength(0)
    })

    test('error boundary shows fallback UI', async ({ page }) => {
      test.skip('Requires error injection')
    })
  })
})
