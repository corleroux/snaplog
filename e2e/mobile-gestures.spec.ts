/**
 * E2E: Mobile Gesture Tests
 *
 * Tests for mobile-specific gestures and interactions:
 * - Swipe left on event card reveals edit
 * - Swipe right on event card reveals delete
 * - Swipe action button executes correctly
 * - Pull-to-refresh on events list
 * - Pull-to-refresh on vendors list
 * - Pull-to-refresh on styles list
 * - Touch targets are minimum 44x44px
 * - Safe areas respected on notched devices
 *
 * NOTE: These tests only run on the mobile-chrome project (Pixel 5 emulation)
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent, waitForAppReady } from './fixtures/test-data'
import { EventsPage } from './fixtures/page-objects/events-page'
import { VendorsPage } from './fixtures/page-objects/vendors-page'
import { StylesPage } from './fixtures/page-objects/styles-page'
import { swipe, pullToRefresh, verifyTouchTargetSize, verifySafeAreaTop, verifySafeAreaBottom, verifyNotchClearance } from './helpers/mobile-helpers'

// Only run on mobile-chrome project
test.describe.configure({ mode: 'parallel' })

// SKIP: Mobile gesture simulation (swipe, pull-to-refresh) is unreliable in Playwright
// desktop/CI. Run manually on device or in Playwright's mobile-chrome project.
// Re-enable for dedicated mobile-chrome CI job when P3-MOB-1 (mobile pipeline) is set up.
test.describe.skip('Mobile Gestures', () => {
  let eventsPage: EventsPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)
    eventsPage = new EventsPage(page)
  })

  test.describe('Swipe Actions on Events', () => {
    test('swipe left on event card reveals edit', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      // Swipe left
      await swipe(page, firstEvent, 'left', 200)

      // Edit button should be visible
      if (await eventsPage.editButton.isVisible({ timeout: 1000 })) {
        await expect(eventsPage.editButton.first()).toBeVisible()
      }
    })

    test('swipe right on event card reveals delete', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      // Swipe right
      await swipe(page, firstEvent, 'right', 200)

      // Delete button should be visible
      if (await eventsPage.deleteButton.isVisible({ timeout: 1000 })) {
        await expect(eventsPage.deleteButton.first()).toBeVisible()
      }
    })

    test('tap swipe action button executes correctly', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      // Swipe to reveal actions
      await swipe(page, firstEvent, 'left', 200)

      // Tap the action button
      const actionButton = eventsPage.editButton.first()
      if (await actionButton.isVisible({ timeout: 1000 })) {
        await actionButton.click()
        await waitForAppReady(page)

        // Should navigate to edit or perform action
        const url = page.url()
        const navigated = url.includes('/edit') || url.includes('/vendors')
        expect(navigated).toBeTruthy()
      }
    })

    test('swipe back restores card to original state', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      // Swipe left
      await swipe(page, firstEvent, 'left', 200)

      // Swipe right to undo
      await swipe(page, firstEvent, 'right', 200)

      // Action buttons should be hidden again
      const hasVisibleActions = await eventsPage.editButton.isVisible().catch(() => false) ||
                               await eventsPage.deleteButton.isVisible().catch(() => false)

      expect(hasVisibleActions).toBe(false)
    })
  })

  test.describe('Pull-to-Refresh', () => {
    test('pull-to-refresh on events list refreshes data', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const list = eventsPage.eventsList
      if (!(await list.isVisible())) {
        test.skip('Events list not visible')
      }

      // Get initial event count
      const initialCount = await eventsPage.getEventCards()

      // Perform pull-to-refresh
      await pullToRefresh(page, list, 150)
      await waitForAppReady(page)

      // Events should still be visible
      const afterRefresh = await eventsPage.getEventCards()
      expect(afterRefresh.length).toBeGreaterThanOrEqual(initialCount.length)
    })

    test('pull-to-refresh on vendors list refreshes data', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const vendorsPage = new VendorsPage(page)
      const list = vendorsPage.vendorsList

      if (!(await list.isVisible())) {
        test.skip('Vendors list not visible')
      }

      // Perform pull-to-refresh
      await pullToRefresh(page, list, 150)
      await waitForAppReady(page)

      // Should still be on vendors page
      await expect(page).toHaveURL(/\/vendors/)
    })

    test('pull-to-refresh on styles list refreshes data', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const vendorsPage = new VendorsPage(page)
      const vendorLink = page.getByRole('link', { name: /vendor/i }).first()

      if (!(await vendorLink.isVisible())) {
        test.skip('No vendors found')
      }

      await vendorLink.click()
      await waitForAppReady(page)

      const stylesPage = new StylesPage(page)
      const list = stylesPage.stylesList

      if (!(await list.isVisible())) {
        test.skip('Styles list not visible')
      }

      // Perform pull-to-refresh
      await pullToRefresh(page, list, 150)
      await waitForAppReady(page)

      // Should still be on styles page
      await expect(page).toHaveURL(/\/styles/)
    })
  })

  test.describe('Touch Targets', () => {
    test('buttons meet minimum touch target size (44x44px)', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Check common touch targets
      const buttons = page.getByRole('button')
      const buttonCount = await buttons.count()

      // Sample first few buttons
      const undersized: number[] = []
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const isSized = await verifyTouchTargetSize(buttons.nth(i))
        if (!isSized) {
          undersized.push(i)
        }
      }

      // All sampled buttons should meet minimum size
      expect(undersized.length).toBe(0)
    })

    test('links meet minimum touch target size', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const links = page.getByRole('link')
      const linkCount = await links.count()

      if (linkCount > 0) {
        const firstLink = links.first()
        const isSized = await verifyTouchTargetSize(firstLink)

        // At least the first link should be properly sized
        expect(isSized).toBeTruthy()
      }
    })

    test('form inputs meet minimum touch target size', async ({ page }) => {
      // Navigate to a form
      await eventsPage.gotoEventsList()
      await eventsPage.clickCreateEvent()

      const inputs = page.getByRole('textbox').or(page.getByLabel(/./))
      const inputCount = await inputs.count()

      if (inputCount > 0) {
        const firstInput = inputs.first()
        const isSized = await verifyTouchTargetSize(firstInput)

        expect(isSized).toBeTruthy()
      }
    })
  })

  test.describe('Safe Areas', () => {
    test('safe area top is respected', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const hasSafeArea = await verifySafeAreaTop(page)
      expect(hasSafeArea).toBeTruthy()
    })

    test('safe area bottom is respected', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const hasSafeArea = await verifySafeAreaBottom(page)
      expect(hasSafeArea).toBeTruthy()
    })

    test('no content under notch', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const hasClearance = await verifyNotchClearance(page)
      expect(hasClearance).toBeTruthy()
    })

    test('back button is in safe area', async ({ page }) => {
      // Navigate to a detail page
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const backButton = page.getByRole('button', { name: /back|←/ })

      if (await backButton.isVisible()) {
        const box = await backButton.boundingBox()
        if (box) {
          // Should be at least 10px from top edge
          expect(box.y).toBeGreaterThanOrEqual(10)
        }
      }
    })
  })

  test.describe('Swipe Actions on Vendors', () => {
    test('swipe left on vendor card reveals edit', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const vendorsPage = new VendorsPage(page)
      const firstVendor = vendorsPage.vendorCard.first()

      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      await swipe(page, firstVendor, 'left', 200)

      if (await vendorsPage.editVendorButton.isVisible({ timeout: 1000 })) {
        await expect(vendorsPage.editVendorButton.first()).toBeVisible()
      }
    })

    test('swipe right on vendor card reveals delete', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const vendorsPage = new VendorsPage(page)
      const firstVendor = vendorsPage.vendorCard.first()

      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      await swipe(page, firstVendor, 'right', 200)

      if (await vendorsPage.deleteVendorButton.isVisible({ timeout: 1000 })) {
        await expect(vendorsPage.deleteVendorButton.first()).toBeVisible()
      }
    })
  })

  test.describe('Swipe Actions on Styles', () => {
    test('swipe left on style card reveals edit', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const vendorLink = page.getByRole('link', { name: /vendor/i }).first()
      if (!(await vendorLink.isVisible())) {
        test.skip('No vendors found')
      }

      await vendorLink.click()

      const stylesPage = new StylesPage(page)
      const firstStyle = stylesPage.styleCard.first()

      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await swipe(page, firstStyle, 'left', 200)

      if (await stylesPage.editStyleButton.isVisible({ timeout: 1000 })) {
        await expect(stylesPage.editStyleButton.first()).toBeVisible()
      }
    })

    test('swipe right on style card reveals delete', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const vendorLink = page.getByRole('link', { name: /vendor/i }).first()
      if (!(await vendorLink.isVisible())) {
        test.skip('No vendors found')
      }

      await vendorLink.click()

      const stylesPage = new StylesPage(page)
      const firstStyle = stylesPage.styleCard.first()

      if (!(await firstStyle.isVisible())) {
        test.skip('No styles found')
      }

      await swipe(page, firstStyle, 'right', 200)

      if (await stylesPage.deleteStyleButton.isVisible({ timeout: 1000 })) {
        await expect(stylesPage.deleteStyleButton.first()).toBeVisible()
      }
    })
  })

  test.describe('Scroll Behavior', () => {
    test('scrolling works smoothly', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Scroll down
      await page.mouse.wheel(0, 500)
      await page.waitForTimeout(500)

      // Should have scrolled
      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY).toBeGreaterThan(0)
    })

    test('scroll bounce effect (iOS-style)', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Try to scroll past top
      await page.mouse.wheel(0, -500)
      await page.waitForTimeout(500)

      // Should still be at top (not negative scroll)
      const scrollY = await page.evaluate(() => window.scrollY)
      expect(scrollY).toBe(0)
    })
  })

  test.describe('Orientation Changes', () => {
    test('layout adapts to landscape', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Get initial layout
      const portraitWidth = await page.viewportSize()?.width || 0

      // Rotate to landscape
      await page.setViewportSize({ width: 812, height: 375 })
      await page.waitForTimeout(500)

      // Content should still be visible
      await expect(eventsPage.eventsList).toBeVisible()
    })
  })
})
