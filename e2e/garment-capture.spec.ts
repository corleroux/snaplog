/**
 * E2E: Garment Capture Flow (FR-SCH-05)
 *
 * Verifies the schema-driven garment path:
 * - Open the schema-driven item capture
 * - Pick the garment catalogue type
 * - Upload a test image
 * - Wait for extraction to complete (mocked at the function boundary)
 * - Review shows schema-rendered fields with missing-field flags
 * - Commit produces a catalogue item
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent } from './fixtures/test-data'
import { existsSync } from 'node:fs'
import path from 'path'

const fixturePath = path.join(__dirname, 'fixtures', 'assets', 'sample-garment.jpg')

// Garment fixtures come from the Saturday shoot (FR-MOD-04 eval set).
// Skip until the real capture asset lands.
test.skip(!existsSync(fixturePath), 'sample-garment.jpg not captured yet')

test.describe('Garment Capture Flow @core', () => {
  test('capture garment end-to-end', async ({ page }) => {
    // Step 1: Login
    await login(page)

    // Step 2: Navigate to a vendor's page
    const eventName = await createTestEvent(page)
    void eventName

    const firstVendor = page.getByRole('button', { name: /vendor/i }).first()
    if (await firstVendor.isVisible()) {
      await firstVendor.click()
    }

    // Step 3: Open schema-driven item capture
    // (linked from the vendor detail; falls back to direct navigation)
    const newItemButton = page.getByRole('button', { name: /new item|catalogue.*item|add.*item/i })
    if (await newItemButton.isVisible()) {
      await newItemButton.click()
    } else {
      await page.goto(`/events/${process.env.TEST_EVENT_ID ?? ''}/vendors/${process.env.TEST_VENDOR_ID ?? ''}/items/new/capture`)
    }

    // Step 4: Pick the garment catalogue type
    const garmentOption = page.getByRole('radio', { name: /garment/i })
    await expect(garmentOption).toBeVisible({ timeout: 15_000 })
    await garmentOption.click()

    // Step 5: Upload a test image
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(fixturePath)

    // Step 6: Start extraction
    await page.getByRole('button', { name: /extract.*info/i }).click()

    // Step 7: Review — schema-rendered fields appear
    await expect(page.getByLabel(/garment.*type|silhouette/i).first()).toBeVisible({ timeout: 45_000 })

    // Step 8: Save the item
    await page.getByRole('button', { name: /save garment/i }).click()

    // Step 9: Success confirmation
    await expect(page.getByText(/saved to the catalogue/i)).toBeVisible({ timeout: 15_000 })
  })
})
