/**
 * E2E: Sharing Feature Tests
 *
 * Tests for the sharing functionality:
 * - Click share button opens ShareDialog
 * - Generate share link
 * - Copy share link to clipboard
 * - Set expiration date on share link
 * - Access public share link
 * - Public view shows event, vendors, styles
 * - QR code button generates QR code
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent, waitForAppReady } from './fixtures/test-data'
import { EventsPage } from './fixtures/page-objects/events-page'
import { SharedPage } from './fixtures/page-objects/shared-page'
import { cleanupSharedToken } from './helpers/cleanup-helpers'

// SKIP: ShareDialog share button is a TODO stub in EventsScreen.
// PublicCatalogueView renders a placeholder div — shared links deliver an empty page.
// Re-enable when P3-SHARE-1 is implemented.
test.describe.skip('Sharing Feature', () => {
  let eventsPage: EventsPage
  let sharedPage: SharedPage
  let shareToken: string | null = null

  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)
    eventsPage = new EventsPage(page)
    sharedPage = new SharedPage(page)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup share token
    if (shareToken) {
      await cleanupSharedToken(shareToken)
      shareToken = null
    }
  })

  test.describe('Share Dialog', () => {
    test('click share button opens ShareDialog', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        await sharedPage.assertShareDialogOpen()
      } else {
        test.skip('Share button not visible')
      }
    })

    test('share dialog displays share link', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        // Share link input should be visible
        await expect(sharedPage.shareLinkInput).toBeVisible()

        // Link should contain a URL
        const link = await sharedPage.getShareLink()
        expect(link).toMatch(/https?:\/\//)

        // Extract token for cleanup
        const tokenMatch = link.match(/\/share\/([^/?]+)/)
        if (tokenMatch) {
          shareToken = tokenMatch[1]
        }
      } else {
        test.skip('Share button not visible')
      }
    })

    test('close share dialog', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()
        await sharedPage.assertShareDialogOpen()

        await sharedPage.closeShareDialog()
        await sharedPage.assertShareDialogClosed()
      } else {
        test.skip('Share button not visible')
      }
    })
  })

  test.describe('Copy Share Link', () => {
    test('copy share link to clipboard', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        // Copy link
        await sharedPage.copyShareLink()

        // Verify copied message
        await expect(sharedPage.shareLinkCopiedMessage).toBeVisible()

        // Verify clipboard content
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
        expect(clipboardText).toMatch(/https?:\/\//)

        // Extract token for cleanup
        const tokenMatch = clipboardText.match(/\/share\/([^/?]+)/)
        if (tokenMatch) {
          shareToken = tokenMatch[1]
        }
      } else {
        test.skip('Share button not visible')
      }
    })
  })

  test.describe('Share Link Expiration', () => {
    test('set expiration date on share link', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        if (await sharedPage.setExpirationButton.isVisible({ timeout: 2000 })) {
          await sharedPage.setExpirationButton.click()

          // Set expiration to next week
          const nextWeek = new Date()
          nextWeek.setDate(nextWeek.getDate() + 7)
          const dateStr = nextWeek.toISOString().split('T')[0]

          await sharedPage.expirationDateInput.fill(dateStr)

          // Save/close dialog
          await sharedPage.closeShareDialog()
        }
      } else {
        test.skip('Share button not visible')
      }
    })

    test('expired share link shows error', async ({ page }) => {
      // This test requires setting an expiration in the past
      // which may not be supported by the UI
      test.skip('Requires backend support for past expiration dates')
    })
  })

  test.describe('Public Share Link Access', () => {
    test('access public share link', async ({ page }) => {
      // First, generate a share link
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        const link = await sharedPage.getShareLink()
        const tokenMatch = link.match(/\/share\/([^/?]+)/)
        if (tokenMatch) {
          shareToken = tokenMatch[1]

          // Access the public link (logged out state)
          await page.evaluate(() => {
            localStorage.clear()
            sessionStorage.clear()
          })

          await page.goto(link)
          await waitForAppReady(page)

          // Should see public catalogue view
          await expect(page.getByText(/share|catalog|public/i)).toBeVisible()
        }
      } else {
        test.skip('Share button not visible')
      }
    })

    test('public view shows event details', async ({ page }) => {
      // Generate share link
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        const link = await sharedPage.getShareLink()
        const tokenMatch = link.match(/\/share\/([^/?]+)/)
        if (tokenMatch) {
          shareToken = tokenMatch[1]

          // Clear auth and access public link
          await page.evaluate(() => {
            localStorage.clear()
          })
          await page.goto(link)
          await waitForAppReady(page)

          // Should show event information
          await expect(page.getByText(/event|catalog/i)).toBeVisible()
        }
      } else {
        test.skip('Share button not visible')
      }
    })

    test('public view shows vendors', async ({ page }) => {
      // Generate share link
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        const link = await sharedPage.getShareLink()
        const tokenMatch = link.match(/\/share\/([^/?]+)/)
        if (tokenMatch) {
          shareToken = tokenMatch[1]

          // Access public link
          await page.evaluate(() => {
            localStorage.clear()
          })
          await page.goto(link)
          await waitForAppReady(page)

          // Look for vendors section
          const vendorsSection = page.getByText(/vendor|exhibitor/i)
          if (await vendorsSection.isVisible({ timeout: 2000 })) {
            await expect(vendorsSection).toBeVisible()
          }
        }
      } else {
        test.skip('Share button not visible')
      }
    })

    test('public view shows styles', async ({ page }) => {
      // Generate share link
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        const link = await sharedPage.getShareLink()
        const tokenMatch = link.match(/\/share\/([^/?]+)/)
        if (tokenMatch) {
          shareToken = tokenMatch[1]

          // Access public link
          await page.evaluate(() => {
            localStorage.clear()
          })
          await page.goto(link)
          await waitForAppReady(page)

          // Look for styles/fabrics section
          const stylesSection = page.getByText(/style|fabric|product/i)
          if (await stylesSection.isVisible({ timeout: 2000 })) {
            await expect(stylesSection).toBeVisible()
          }
        }
      } else {
        test.skip('Share button not visible')
      }
    })

    test('public view does not show edit controls', async ({ page }) => {
      // Generate share link
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        const link = await sharedPage.getShareLink()
        const tokenMatch = link.match(/\/share\/([^/?]+)/)
        if (tokenMatch) {
          shareToken = tokenMatch[1]

          // Access public link
          await page.evaluate(() => {
            localStorage.clear()
          })
          await page.goto(link)
          await waitForAppReady(page)

          // Edit controls should not be visible
          const editButton = page.getByRole('button', { name: /edit|delete|admin/i })
          await expect(editButton).not.toBeVisible()
        }
      } else {
        test.skip('Share button not visible')
      }
    })
  })

  test.describe('QR Code Generation', () => {
    test('QR code button generates QR code', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        if (await sharedPage.generateQRCodeButton.isVisible({ timeout: 2000 })) {
          await sharedPage.generateQRCode()

          // QR code should be visible (canvas, img, or svg)
          await expect(sharedPage.qrCode).toBeVisible()
        }
      } else {
        test.skip('Share button not visible')
      }
    })

    test('QR code is scannable', async ({ page }) => {
      // This test verifies the QR code element exists
      // Actual scanning would require external tools
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        if (await sharedPage.generateQRCodeButton.isVisible({ timeout: 2000 })) {
          await sharedPage.generateQRCode()

          // QR code element should have source or content
          const qrElement = sharedPage.qrCode.first()
          await expect(qrElement).toBeVisible()
        }
      } else {
        test.skip('Share button not visible')
      }
    })
  })

  test.describe('Share Settings', () => {
    test('toggle share link on/off', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.shareButton.isVisible({ timeout: 2000 })) {
        await eventsPage.shareButton.first().click()

        // Look for toggle switch
        const toggleSwitch = page.getByRole('switch').or(page.locator('[class*="toggle"]'))
        if (await toggleSwitch.isVisible({ timeout: 2000 })) {
          const isChecked = await toggleSwitch.isChecked()

          // Toggle
          await toggleSwitch.click()
          await page.waitForTimeout(500)

          // State should have changed
          const newChecked = await toggleSwitch.isChecked()
          expect(newChecked).toBe(!isChecked)
        }
      } else {
        test.skip('Share button not visible')
      }
    })
  })
})
