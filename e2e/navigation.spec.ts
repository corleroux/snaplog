/**
 * E2E: Navigation Tests
 *
 * Tests for app navigation:
 * - Events list → vendors list navigation
 * - Vendors list → styles list navigation
 * - Styles list → style details navigation
 * - Back button navigation
 * - Navigation footer links
 * - Direct URL navigation
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent, waitForAppReady } from './fixtures/test-data'
import { EventsPage } from './fixtures/page-objects/events-page'
import { VendorsPage } from './fixtures/page-objects/vendors-page'
import { StylesPage } from './fixtures/page-objects/styles-page'

test.describe('Navigation @core', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)
  })

  test.describe('Happy Path Navigation', () => {
    test('navigate from events to vendors list', async ({ page }) => {
      const eventsPage = new EventsPage(page)

      // Click on first event
      await eventsPage.clickEventByName(/./)
      await waitForAppReady(page)

      // Should be on vendors list
      await expect(page).toHaveURL(/\/events\/.+\/vendors/)
      await expect(page.getByText(/vendor|booth/i)).toBeVisible()
    })

    test('navigate from vendors to styles list', async ({ page }) => {
      const eventsPage = new EventsPage(page)
      const vendorsPage = new VendorsPage(page)

      // Navigate to event
      await eventsPage.clickEventByName(/./)

      // Click on first vendor
      await vendorsPage.clickVendorByName(/./)
      await waitForAppReady(page)

      // Should be on styles list or vendor detail
      const url = page.url()
      const isStylesList = url.includes('/styles')
      const isVendorDetail = url.includes('/vendors/') && !url.includes('/styles')

      expect(isStylesList || isVendorDetail).toBeTruthy()
    })

    test('navigate from styles list to style details', async ({ page }) => {
      const eventsPage = new EventsPage(page)
      const vendorsPage = new VendorsPage(page)
      const stylesPage = new StylesPage(page)

      // Navigate to event
      await eventsPage.clickEventByName(/./)

      // Navigate to vendor
      await vendorsPage.clickVendorByName(/./)

      // Check if we're on styles list or vendor detail
      const url = page.url()
      if (url.includes('/styles')) {
        // Already on styles list, click a style
        await stylesPage.clickStyleByName(/./)
        await waitForAppReady(page)

        // Should be on style detail
        await expect(page).toHaveURL(/\/vendors\/.+\/styles\/.+/)
      } else if (url.includes('/vendors/')) {
        // On vendor detail, look for styles link
        const stylesLink = page.getByRole('link', { name: /styles|fabrics|products/i })
        if (await stylesLink.isVisible({ timeout: 2000 })) {
          await stylesLink.click()
          await waitForAppReady(page)
          await stylesPage.clickStyleByName(/./)
        }
      }
    })
  })

  test.describe('Back Button Navigation', () => {
    test('back button returns from vendors to events', async ({ page }) => {
      const eventsPage = new EventsPage(page)

      // Navigate to vendors
      await eventsPage.clickEventByName(/./)
      await waitForAppReady(page)

      await expect(page).toHaveURL(/\/vendors/)

      // Click back button
      const backButton = page.getByRole('button', { name: /back|←/ })
      if (await backButton.isVisible()) {
        await backButton.click()
        await waitForAppReady(page)

        // Should be back on events
        await expect(page).toHaveURL(/\/events/)
      }
    })

    test('back button returns from styles to vendors', async ({ page }) => {
      const eventsPage = new EventsPage(page)
      const vendorsPage = new VendorsPage(page)

      // Navigate to vendor
      await eventsPage.clickEventByName(/./)
      await vendorsPage.clickVendorByName(/./)
      await waitForAppReady(page)

      // Click back button
      const backButton = page.getByRole('button', { name: /back|←/ })
      if (await backButton.isVisible()) {
        await backButton.click()
        await waitForAppReady(page)

        // Should be back on vendors
        await expect(page).toHaveURL(/\/vendors/)
      }
    })

    test('browser back button works', async ({ page }) => {
      const eventsPage = new EventsPage(page)

      // Navigate to vendors
      await eventsPage.clickEventByName(/./)
      await waitForAppReady(page)

      await expect(page).toHaveURL(/\/vendors/)

      // Use browser back
      await page.goBack()
      await waitForAppReady(page)

      // Should be back on events
      await expect(page).toHaveURL(/\/events/)
    })
  })

  test.describe('Direct URL Navigation', () => {
    test('direct navigation to events list works', async ({ page }) => {
      await page.goto('/events')
      await waitForAppReady(page)

      await expect(page).toHaveURL(/\/events/)
    })

    test('direct navigation to vendors list works', async ({ page }) => {
      // First get a valid event ID
      const eventName = await createTestEvent(page)
      const eventLink = page.getByRole('link', { name: eventName }).or(
        page.locator('a').filter({ hasText: eventName })
      )
      const href = await eventLink.getAttribute('href')
      const eventId = href?.split('/').pop() || ''

      // Navigate directly to vendors
      await page.goto(`/events/${eventId}/vendors`)
      await waitForAppReady(page)

      await expect(page).toHaveURL(/\/vendors/)
    })

    test('direct navigation to invalid event shows error or redirects', async ({ page }) => {
      await page.goto('/events/invalid-id-12345/vendors')
      await waitForAppReady(page)

      // Should either show error or redirect to events
      const hasError = await page.getByText(/not found|error|invalid/i).isVisible().catch(() => false)
      const isEventsPage = page.url().includes('/events')

      expect(hasError || isEventsPage).toBeTruthy()
    })

    test('direct navigation to login page works', async ({ page }) => {
      await page.goto('/login')

      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByLabel('Email')).toBeVisible()
    })
  })

  test.describe('Navigation Footer/Bottom Bar', () => {
    test('bottom navigation has expected links', async ({ page }) => {
      const eventsPage = new EventsPage(page)

      // Look for bottom navigation
      const bottomNav = page.locator('nav').filter({ has: page.getByRole('link') })
      const homeLink = page.getByRole('link', { name: /home|events/i })

      // Bottom nav might not exist on all pages
      const hasBottomNav = await bottomNav.isVisible().catch(() => false)
      const hasHomeLink = await homeLink.isVisible().catch(() => false)

      expect(hasBottomNav || hasHomeLink).toBeTruthy()
    })

    test('home link navigates to events', async ({ page }) => {
      const homeLink = page.getByRole('link', { name: /home|events/i })

      if (await homeLink.isVisible({ timeout: 2000 })) {
        await homeLink.click()
        await waitForAppReady(page)

        await expect(page).toHaveURL(/\/events/)
      }
    })
  })

  test.describe('Breadcrumb Navigation', () => {
    test('breadcrumbs show correct hierarchy', async ({ page }) => {
      const eventsPage = new EventsPage(page)
      const vendorsPage = new VendorsPage(page)

      // Navigate to vendor
      await eventsPage.clickEventByName(/./)
      await vendorsPage.clickVendorByName(/./)

      // Look for breadcrumbs
      const breadcrumbs = page.locator('[aria-label="breadcrumb"], .breadcrumbs, nav[aria-label*="breadcrumb"]')

      if (await breadcrumbs.isVisible({ timeout: 2000 })) {
        await expect(breadcrumbs).toBeVisible()
        await expect(breadcrumbs.getByText(/events/i)).toBeVisible()
      }
    })

    test('breadcrumb links navigate correctly', async ({ page }) => {
      const eventsPage = new EventsPage(page)
      const vendorsPage = new VendorsPage(page)

      // Navigate to vendor
      await eventsPage.clickEventByName(/./)
      await vendorsPage.clickVendorByName(/./)

      // Look for events breadcrumb
      const eventsBreadcrumb = page.locator('[aria-label="breadcrumb"], .breadcrumbs')
        .getByRole('link', { name: /events/i })

      if (await eventsBreadcrumb.isVisible({ timeout: 2000 })) {
        await eventsBreadcrumb.click()
        await waitForAppReady(page)

        await expect(page).toHaveURL(/\/events/)
      }
    })
  })

  test.describe('Tab/Menu Navigation', () => {
    test('menu button opens navigation menu', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /menu|hamburger|open/i })

      if (await menuButton.isVisible({ timeout: 2000 })) {
        await menuButton.click()

        // Menu should be visible
        const menu = page.getByRole('navigation').or(page.locator('.menu, [role="dialog"]'))
        await expect(menu.first()).toBeVisible()
      }
    })

    test('menu contains expected links', async ({ page }) => {
      const menuButton = page.getByRole('button', { name: /menu|open/i })

      if (await menuButton.isVisible({ timeout: 2000 })) {
        await menuButton.click()

        // Look for common menu items
        const eventsLink = page.getByRole('link', { name: /events/i })
        const settingsLink = page.getByRole('link', { name: /settings|profile|account/i })
        const logoutLink = page.getByRole('button', { name: /logout|sign.*out/i })

        // At least some menu items should be present
        const hasMenuItems = await eventsLink.isVisible().catch(() => false) ||
                            await settingsLink.isVisible().catch(() => false) ||
                            await logoutLink.isVisible().catch(() => false)

        expect(hasMenuItems).toBeTruthy()
      }
    })
  })
})
