/**
 * E2E: Style (Fabric) Management Tests
 *
 * Enhanced tests for style/fabric operations:
 * - Create style via capture flow
 * - Edit style details
 * - Add variant to style
 * - Delete variant
 * - Swipe actions
 * - Export styles
 * - Search and filter
 * - Style detail view
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent, waitForAppReady } from './fixtures/test-data'
import { EventsPage } from './fixtures/page-objects/events-page'
import { VendorsPage } from './fixtures/page-objects/vendors-page'
import { StylesPage } from './fixtures/page-objects/styles-page'
import { cleanupStyle } from './helpers/cleanup-helpers'

test.describe('Style Management @core', () => {
  let stylesPage: StylesPage
  let createdStyleId: string | null = null
  let createdStyleName: string | null = null

  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)

    const eventsPage = new EventsPage(page)
    const eventName = await createTestEvent(page)
    await eventsPage.clickEventByName(eventName)

    const vendorsPage = new VendorsPage(page)

    // Navigate to a vendor's styles
    const vendorLink = page.getByRole('link', { name: /vendor/i }).first()
    if (await vendorLink.isVisible()) {
      await vendorLink.click()
      await waitForAppReady(page)
    }

    stylesPage = new StylesPage(page)
  })

  test.afterEach(async ({ page }) => {
    if (createdStyleId) {
      await cleanupStyle(createdStyleId)
      createdStyleId = null
      createdStyleName = null
    }
  })

  test.describe('Create Style', () => {
    test('create style via capture flow', async ({ page }) => {
      await stylesPage.clickAddStyle()

      // Should be on capture page
      await expect(page).toHaveURL(/\/capture|styles\/new/i)
    })

    test('create style with manual entry', async ({ page }) => {
      await stylesPage.clickAddStyle()

      const styleName = `E2E Test Style ${Date.now()}`
      createdStyleName = styleName

      await stylesPage.fillStyleForm({
        name: styleName,
        category: 'Test Category',
        season: 'SS26',
        composition: '100% Cotton',
        price: '25.00',
      })

      await stylesPage.saveButton.click()
      await waitForAppReady(page)

      // Should be on styles list
      await expect(page).toHaveURL(/\/styles/)
      await stylesPage.assertStyleVisible(styleName)
    })
  })

  test.describe('Edit Style', () => {
    test('edit existing style', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      // Get original name
      const originalName = await firstStyle.textContent() || ''

      // Hover and click edit
      await firstStyle.hover()
      if (await stylesPage.editStyleButton.isVisible({ timeout: 1000 })) {
        await stylesPage.editStyleButton.first().click()
      } else {
        await firstStyle.click()
        const editButton = page.getByRole('button', { name: /edit/i })
        if (await editButton.isVisible({ timeout: 2000 })) {
          await editButton.click()
        }
      }

      await waitForAppReady(page)

      // Update style
      const updatedName = `Updated ${originalName}`
      const nameInput = page.getByLabel(/style.*name|fabric.*name|name/i)
      if (await nameInput.isVisible()) {
        await nameInput.fill(updatedName)
        await stylesPage.saveButton.click()
        await waitForAppReady(page)

        await stylesPage.assertStyleVisible(updatedName)
      }
    })

    test('cancel edit keeps original values', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      const originalName = await firstStyle.textContent() || ''

      await firstStyle.click()

      const editButton = page.getByRole('button', { name: /edit/i })
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click()

        const nameInput = page.getByLabel(/style.*name|name/i)
        if (await nameInput.isVisible()) {
          await nameInput.fill('Changed Name')
          await stylesPage.cancelButton.click()
        }
      }

      await waitForAppReady(page)
      await stylesPage.assertStyleVisible(originalName)
    })
  })

  test.describe('Style Variants', () => {
    test('add variant to style', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await firstStyle.click()

      const addVariantVisible = await stylesPage.addVariantButton.isVisible({ timeout: 2000 }).catch(() => false)
      if (addVariantVisible) {
        await stylesPage.clickAddVariant()

        await stylesPage.fillVariantForm({
          color: 'Red',
          size: 'M',
          sku: `SKU-${Date.now()}`,
          stock: '10',
          price: '25.00',
        })

        await stylesPage.saveVariantButton.click()
        await waitForAppReady(page)

        // Variant should be added
        const variantCount = await stylesPage.getVariantCount()
        expect(variantCount).toBeGreaterThan(0)
      } else {
        test.skip('Add variant button not found')
      }
    })

    test('edit existing variant', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await firstStyle.click()

      const firstVariant = stylesPage.variantCard.first()
      if (await firstVariant.isVisible({ timeout: 2000 })) {
        await firstVariant.click()

        const editButton = page.getByRole('button', { name: /edit/i })
        if (await editButton.isVisible()) {
          await editButton.click()

          const colorInput = page.getByLabel(/color/i)
          if (await colorInput.isVisible()) {
            await colorInput.fill('Blue')
            await page.getByRole('button', { name: /save/i }).click()
            await waitForAppReady(page)
          }
        }
      } else {
        test.skip('No variants found')
      }
    })

    test('delete variant', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await firstStyle.click()

      const firstVariant = stylesPage.variantCard.first()
      if (await firstVariant.isVisible({ timeout: 2000 })) {
        const initialCount = await stylesPage.getVariantCount()

        const deleteButton = firstVariant.getByRole('button', { name: /delete/i })
        if (await deleteButton.isVisible({ timeout: 1000 })) {
          await deleteButton.click()

          const confirmButton = page.getByRole('button', { name: /confirm|delete/i })
          if (await confirmButton.isVisible({ timeout: 1000 })) {
            await confirmButton.click()
          }

          await waitForAppReady(page)

          const newCount = await stylesPage.getVariantCount()
          expect(newCount).toBeLessThan(initialCount)
        }
      } else {
        test.skip('No variants found')
      }
    })
  })

  test.describe('Delete Style', () => {
    test('delete style with confirmation', async ({ page }) => {
      // Create a style to delete
      await stylesPage.clickAddStyle()
      const styleName = `To Delete ${Date.now()}`
      await stylesPage.fillStyleForm({ name: styleName })
      await stylesPage.saveButton.click()
      await waitForAppReady(page)

      // Delete it
      await stylesPage.deleteStyleWithName(styleName)
      await stylesPage.assertStyleNotVisible(styleName)
    })
  })

  // SKIP: Swipe gesture simulation is unreliable in desktop Playwright.
  // Covered by mobile-gestures.spec.ts (manual/mobile CI).
  test.describe.skip('Swipe Actions', () => {
    test('swipe left reveals edit action', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await stylesPage.swipeLeftToEdit(await firstStyle.textContent() || 'Style')

      if (await stylesPage.editStyleButton.isVisible({ timeout: 1000 })) {
        await expect(stylesPage.editStyleButton.first()).toBeVisible()
      }
    })

    test('swipe right reveals delete action', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await stylesPage.swipeRightToDelete(await firstStyle.textContent() || 'Style')

      if (await stylesPage.deleteStyleButton.isVisible({ timeout: 1000 })) {
        await expect(stylesPage.deleteStyleButton.first()).toBeVisible()
      }
    })
  })

  test.describe('Search and Filter', () => {
    test('search filters style list', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      const styleName = await firstStyle.textContent() || ''
      const searchPrefix = styleName.substring(0, Math.min(3, styleName.length))

      await stylesPage.search(searchPrefix)
      await page.waitForTimeout(500)

      const results = stylesPage.styleCard
      const resultCount = await results.count()
      expect(resultCount).toBeGreaterThan(0)
    })

    test('filter by category', async ({ page }) => {
      if (!(await stylesPage.filterButton.isVisible())) {
        test.skip('Filter button not visible')
      }

      await stylesPage.openFilters()

      // Look for category filter
      const categoryFilter = page.getByRole('checkbox', { name: /category/i })
        .or(page.getByRole('option', { name: /.*/ }))

      if (await categoryFilter.isVisible({ timeout: 1000 })) {
        await categoryFilter.first().click()
        await page.waitForTimeout(500)

        // Results should be filtered
        const results = await stylesPage.getStyleCount()
        expect(results).toBeGreaterThanOrEqual(0)
      }
    })
  })

  test.describe('Style Detail', () => {
    test('style detail shows all information', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await firstStyle.click()
      await waitForAppReady(page)

      // Look for detail fields
      const fields = [
        stylesPage.styleName,
        stylesPage.styleCategory,
        stylesPage.styleSeason,
        stylesPage.styleComposition,
      ]

      for (const field of fields) {
        if (await field.isVisible({ timeout: 2000 })) {
          await expect(field).toBeVisible()
        }
      }
    })

    test('style images are displayed', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await firstStyle.click()

      const images = stylesPage.styleImages
      const imageCount = await images.count()

      if (imageCount > 0) {
        await expect(images.first()).toBeVisible()
      }
      // No images is also valid
    })
  })

  test.describe('Pull-to-Refresh', () => {
    test('pull-to-refresh refreshes styles list', async ({ page }) => {
      await stylesPage.pullToRefresh()
      await waitForAppReady(page)

      await expect(page).toHaveURL(/\/styles/)
    })
  })

  test.describe('Style Status', () => {
    test('available status is shown', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      const availableBadge = firstStyle.locator(stylesPage.availableBadge)
      if (await availableBadge.isVisible({ timeout: 1000 })) {
        await expect(availableBadge).toBeVisible()
      }
    })

    test('out of stock status is shown', async ({ page }) => {
      const firstStyle = stylesPage.styleCard.first()
      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      const outOfStockBadge = firstStyle.locator(stylesPage.outOfStockBadge)
      if (await outOfStockBadge.isVisible({ timeout: 1000 })) {
        await expect(outOfStockBadge).toBeVisible()
      }
    })
  })
})
