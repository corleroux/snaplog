/**
 * E2E: Garment Capture Flow (FR-SCH-05)
 *
 * Verifies the schema-driven garment path with edge functions mocked at the
 * function boundary (no live model APIs — see helpers/catalogue-mock-helper):
 * - Open the schema-driven item capture
 * - Pick the garment catalogue type
 * - Upload a test image (in-memory buffer — no fixture asset needed)
 * - Review shows schema-rendered fields with missing-field flags
 * - Commit produces a catalogue item
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent } from './fixtures/test-data'
import {
  mockCatalogueItemExtraction,
  mockCatalogueItemCommit,
  clearCatalogueMocks,
} from './helpers/catalogue-mock-helper'

// Minimal valid JPEG (SOI + EOI). Storage accepts the bytes; extraction is mocked.
const TEST_JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xd9])

test.describe('Garment Capture Flow @core', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalogueItemExtraction(page)
    await mockCatalogueItemCommit(page)
  })

  test.afterEach(async ({ page }) => {
    await clearCatalogueMocks(page)
  })

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
    const newItemButton = page.getByRole('button', { name: /new item|catalogue.*item|add.*item/i })
    if (await newItemButton.isVisible()) {
      await newItemButton.click()
    } else {
      await page.goto(`/events/${process.env.TEST_EVENT_ID ?? ''}/vendors/${process.env.TEST_VENDOR_ID ?? ''}/items/new/capture`)
    }

    // Step 4: Pick the garment catalogue type
    const garmentOption = page.getByRole('button', { name: /garment/i })
    await expect(garmentOption).toBeVisible({ timeout: 15_000 })
    await garmentOption.click()

    // Step 5: Upload a test image (in-memory — extraction is mocked)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'garment.jpg',
      mimeType: 'image/jpeg',
      buffer: TEST_JPEG,
    })

    // Step 6: Start extraction
    await page.getByRole('button', { name: /extract.*info/i }).click()

    // Step 7: Review — schema-rendered fields appear (mocked extraction)
    await expect(page.getByLabel(/garment.*type/i).first()).toBeVisible({ timeout: 45_000 })

    // Step 8: Save the item
    await page.getByRole('button', { name: /save garment/i }).click()

    // Step 9: Success confirmation
    await expect(page.getByText(/saved to the catalogue/i)).toBeVisible({ timeout: 15_000 })
  })
})
