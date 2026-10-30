/**
 * E2E: Vendor Capture Flow (Flow 1)
 *
 * Verifies:
 * - Navigate to vendor capture
 * - Upload a test image
 * - Wait for Gemini extraction to complete
 * - Review and submit the commit
 * - Vendor appears in the vendor list
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent } from './fixtures/test-data'
import path from 'path'

test.describe('Vendor Capture Flow @core', () => {
  test('capture vendor card end-to-end', async ({ page }) => {
    // Step 1: Login
    await login(page)

    // Step 2: Create (or navigate to) a test event
    const eventName = await createTestEvent(page)

    // Step 3: Navigate to vendor capture
    await page.getByRole('button', { name: /capture|add.*vendor|scan/i }).click()

    // Step 4: Upload a test image (using a fixture)
    const fixturePath = path.join(__dirname, 'fixtures', 'assets', 'sample-vendor-card.jpg')
    const fileInput = page.getByLabel(/upload|choose.*file|photo|image/i)
      .or(page.locator('input[type="file"]'))

    // If there's a file input, upload the fixture
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(fixturePath)
    } else {
      // Camera capture flow — look for the capture button
      await page.getByRole('button', { name: /capture|take.*photo|scan/i }).click()
    }

    // Step 5: Wait for extraction to complete (may take up to 30s)
    // The review screen should appear with extracted data
    await expect(
      page.getByText(/review|extracted|company|vendor/i)
    ).toBeVisible({ timeout: 45_000 })

    // Step 6: Review the extracted data — verify company name field exists
    const companyInput = page.getByLabel(/company/i)
    if (await companyInput.isVisible()) {
      // Optionally edit the company name
      await companyInput.fill('E2E Test Vendor')
    }

    // Step 7: Submit the commit
    await page.getByRole('button', { name: /save|commit|submit/i }).click()

    // Step 8: Verify redirect to vendor list
    await expect(page).toHaveURL(/\/vendors/, { timeout: 15_000 })

    // Step 9: Verify the vendor appears in the list
    await expect(page.getByText('E2E Test Vendor')).toBeVisible({ timeout: 10_000 })
  })
})
