/**
 * E2E: Fabric Style Capture Flow (Flow 2)
 *
 * Verifies:
 * - Navigate to fabric style capture from a vendor
 * - Upload a test image
 * - Wait for Gemini extraction to complete
 * - Review and submit the commit
 * - Style appears in the style list
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent } from './fixtures/test-data'
import path from 'path'

test.describe('Fabric Style Capture Flow @core', () => {
  test('capture fabric style card end-to-end', async ({ page }) => {
    // Step 1: Login
    await login(page)

    // Step 2: Navigate to a vendor's styles list
    const eventName = await createTestEvent(page)

    // Click on an existing vendor (or create one)
    const firstVendor = page.getByRole('button', { name: /vendor/i }).first()
    if (await firstVendor.isVisible()) {
      await firstVendor.click()
    }

    // Step 3: Navigate to style capture
    await page.getByRole('button', { name: /capture|add.*style|scan/i }).click()

    // Step 4: Upload a test image
    const fixturePath = path.join(__dirname, 'fixtures', 'assets', 'sample-fabric-swatch.jpg')
    const fileInput = page.getByLabel(/upload|choose.*file|photo|image/i)
      .or(page.locator('input[type="file"]'))

    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(fixturePath)
    } else {
      await page.getByRole('button', { name: /capture|take.*photo|scan/i }).click()
    }

    // Step 5: Wait for extraction
    await expect(
      page.getByText(/review|extracted|style|fabric/i)
    ).toBeVisible({ timeout: 45_000 })

    // Step 6: Review — verify style name field exists
    const styleInput = page.getByLabel(/style.*name|item.*name|fabric.*name/i)
    if (await styleInput.isVisible()) {
      await styleInput.fill('E2E Test Cotton Twill')
    }

    // Step 7: Submit the commit
    await page.getByRole('button', { name: /save|commit|submit/i }).click()

    // Step 8: Verify redirect to styles list
    await expect(page).toHaveURL(/\/styles/, { timeout: 15_000 })

    // Step 9: Verify the style appears in the list
    await expect(page.getByText('E2E Test Cotton Twill')).toBeVisible({ timeout: 10_000 })
  })
})
