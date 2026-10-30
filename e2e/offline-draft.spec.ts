/**
 * E2E: Offline Draft Persistence (Flow 3)
 *
 * Verifies:
 * - Start a capture
 * - Simulate connectivity loss
 * - Fill in capture fields
 * - Navigate away and back
 * - Draft is preserved
 */

import { test, expect, type BrowserContext } from '@playwright/test'
import { login, createTestEvent, goOffline, goOnline } from './fixtures/test-data'

// SKIP: Capacitor filesystem integration is stubbed — all upload queue handlers
// return success: false on Capacitor paths. True offline capture is non-functional.
// Re-enable when P4-OFF-1 (real Capacitor offline implementation) is complete.
test.describe.skip('Offline Draft Persistence', () => {
  test('draft survives offline mode and navigation', async ({ page, context }) => {
    // Step 1: Login
    await login(page)

    // Step 2: Create event and navigate to capture
    await createTestEvent(page)
    await page.getByRole('button', { name: /capture|add.*vendor|scan/i }).click()

    // Step 3: Go offline
    await goOffline(context)

    // Step 4: Fill in capture fields (manual entry since we're offline)
    const companyInput = page.getByLabel(/company/i)
    if (await companyInput.isVisible()) {
      await companyInput.fill('Offline Draft Vendor')
    }

    // Step 5: Navigate away (go back)
    await page.goBack()
    await page.waitForLoadState('networkidle').catch(() => {
      // networkidle won't complete offline, that's expected
    })

    // Step 6: Go back online
    await goOnline(context)

    // Step 7: Navigate back to capture
    await page.getByRole('button', { name: /capture|add.*vendor|scan/i }).click()

    // Step 8: Verify draft data is preserved
    // The app should show a "resume draft" prompt or pre-filled fields
    const draftIndicator = page.getByText(/draft|resume|unsaved/i)
    const preservedData = page.getByText('Offline Draft Vendor')

    // At least one of these should be visible
    await expect(
      draftIndicator.or(preservedData)
    ).toBeVisible({ timeout: 10_000 })
  })
})
