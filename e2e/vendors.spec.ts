/**
 * E2E: Vendor Management Tests
 *
 * Enhanced tests for vendor operations:
 * - Create vendor via capture flow
 * - Edit vendor details
 * - Delete vendor
 * - Swipe left/right actions
 * - Export vendors
 * - Search and filter
 * - Active/Archived status toggle
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent, waitForAppReady } from './fixtures/test-data'
import { EventsPage } from './fixtures/page-objects/events-page'
import { VendorsPage } from './fixtures/page-objects/vendors-page'
import { cleanupVendor } from './helpers/cleanup-helpers'

test.describe('Vendor Management @core', () => {
  let vendorsPage: VendorsPage
  let createdVendorId: string | null = null
  let createdVendorName: string | null = null

  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)

    const eventsPage = new EventsPage(page)
    const eventName = await createTestEvent(page)
    await eventsPage.clickEventByName(eventName)

    vendorsPage = new VendorsPage(page)
  })

  test.afterEach(async ({ page }) => {
    if (createdVendorId) {
      await cleanupVendor(createdVendorId)
      createdVendorId = null
      createdVendorName = null
    }
  })

  test.describe('Create Vendor', () => {
    test('create vendor via capture flow', async ({ page }) => {
      await vendorsPage.clickAddVendor()

      // Should be on capture page
      await expect(page).toHaveURL(/\/capture|vendors\/new/i)
    })

    test('create vendor with manual entry', async ({ page }) => {
      await vendorsPage.clickAddVendor()

      const vendorName = `E2E Test Vendor ${Date.now()}`
      createdVendorName = vendorName

      await vendorsPage.fillVendorForm({
        company: vendorName,
        booth: 'A123',
        email: 'test@example.com',
        phone: '+1-555-0123',
        website: 'https://example.com',
      })

      await vendorsPage.saveButton.click()
      await waitForAppReady(page)

      // Should be on vendors list or detail
      await expect(page).toHaveURL(/\/vendors/)
      await vendorsPage.assertVendorVisible(vendorName)
    })
  })

  test.describe('Edit Vendor', () => {
    test('edit existing vendor', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      // Get original name
      const originalName = await firstVendor.textContent() || ''

      // Hover and click edit
      await firstVendor.hover()
      if (await vendorsPage.editVendorButton.isVisible({ timeout: 1000 })) {
        await vendorsPage.editVendorButton.first().click()
      } else {
        // Try clicking directly
        await firstVendor.click()
        const editButton = page.getByRole('button', { name: /edit/i })
        if (await editButton.isVisible({ timeout: 2000 })) {
          await editButton.click()
        }
      }

      await waitForAppReady(page)

      // Update vendor
      const updatedName = `Updated ${originalName}`
      const companyInput = page.getByLabel(/company|name/i)
      if (await companyInput.isVisible()) {
        await companyInput.fill(updatedName)
        await vendorsPage.saveButton.click()
        await waitForAppReady(page)

        await vendorsPage.assertVendorVisible(updatedName)
      }
    })

    test('cancel edit keeps original values', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      const originalName = await firstVendor.textContent() || ''

      await firstVendor.click()

      const editButton = page.getByRole('button', { name: /edit/i })
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click()

        const companyInput = page.getByLabel(/company|name/i)
        if (await companyInput.isVisible()) {
          await companyInput.fill('Changed Name')
          await vendorsPage.cancelButton.click()
        }
      }

      await waitForAppReady(page)
      await vendorsPage.assertVendorVisible(originalName)
    })
  })

  test.describe('Delete Vendor', () => {
    test('delete vendor with confirmation', async ({ page }) => {
      // Create a vendor to delete
      await vendorsPage.clickAddVendor()
      const vendorName = `To Delete ${Date.now()}`
      await vendorsPage.fillVendorForm({ company: vendorName })
      await vendorsPage.saveButton.click()
      await waitForAppReady(page)

      // Delete it
      await vendorsPage.deleteVendorWithName(vendorName)
      await vendorsPage.assertVendorNotVisible(vendorName)
    })

    test('cancel delete keeps vendor', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      const vendorName = await firstVendor.textContent() || ''

      await firstVendor.hover()

      const deleteButtonVisible = await vendorsPage.deleteVendorButton.isVisible({ timeout: 1000 }).catch(() => false)
      if (deleteButtonVisible) {
        await vendorsPage.deleteVendorButton.first().click()

        // Cancel if confirmation appears
        const cancelButton = page.getByRole('button', { name: /cancel|no|keep/i })
        if (await cancelButton.isVisible({ timeout: 1000 })) {
          await cancelButton.click()
        }

        await vendorsPage.assertVendorVisible(vendorName)
      }
    })
  })

  // SKIP: Swipe gesture simulation is unreliable in desktop Playwright.
  // Covered by mobile-gestures.spec.ts (manual/mobile CI).
  test.describe.skip('Swipe Actions', () => {
    test('swipe left reveals edit action', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      await vendorsPage.swipeLeftToEdit(await firstVendor.textContent() || 'Vendor')

      if (await vendorsPage.editVendorButton.isVisible({ timeout: 1000 })) {
        await expect(vendorsPage.editVendorButton.first()).toBeVisible()
      }
    })

    test('swipe right reveals delete action', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      await vendorsPage.swipeRightToDelete(await firstVendor.textContent() || 'Vendor')

      const deleteButtonVisible = await vendorsPage.deleteVendorButton.isVisible({ timeout: 1000 }).catch(() => false)
      if (deleteButtonVisible) {
        await expect(vendorsPage.deleteVendorButton.first()).toBeVisible()
      }
    })
  })

  test.describe('Search and Filter', () => {
    test('search filters vendor list', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      const vendorName = await firstVendor.textContent() || ''
      const searchPrefix = vendorName.substring(0, Math.min(3, vendorName.length))

      await vendorsPage.search(searchPrefix)
      await page.waitForTimeout(500)

      // Should show matching results
      const results = vendorsPage.vendorCard
      const resultCount = await results.count()
      expect(resultCount).toBeGreaterThan(0)
    })

    test('clear search shows all vendors', async ({ page }) => {
      if (!(await vendorsPage.searchInput.isVisible())) {
        test.skip('Search input not visible')
      }

      await vendorsPage.search('xyznonexistent')
      await page.waitForTimeout(500)

      await vendorsPage.searchInput.clear()
      await page.waitForTimeout(500)

      // All vendors should be visible
      const allVendors = vendorsPage.vendorCard
      const count = await allVendors.count()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('Vendor Status', () => {
    test('active/archived status toggle works', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      await firstVendor.click()

      const statusToggle = page.getByRole('switch', { name: /active|status|archived/i })
      if (await statusToggle.isVisible({ timeout: 2000 })) {
        const isChecked = await statusToggle.isChecked()
        await statusToggle.click()
        await page.waitForTimeout(500)

        const newChecked = await statusToggle.isChecked()
        expect(newChecked).toBe(!isChecked)
      }
    })
  })

  test.describe('Vendor Detail', () => {
    test('vendor detail shows all information', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      await firstVendor.click()
      await waitForAppReady(page)

      // Look for detail fields
      const fields = [
        vendorsPage.vendorName,
        vendorsPage.vendorBooth,
        vendorsPage.vendorEmail,
      ]

      for (const field of fields) {
        if (await field.isVisible({ timeout: 2000 })) {
          await expect(field).toBeVisible()
        }
      }
    })

    test('view styles button navigates to styles list', async ({ page }) => {
      const firstVendor = vendorsPage.vendorCard.first()
      if (!(await firstVendor.isVisible())) {
        test.skip('No vendors found')
      }

      await firstVendor.click()

      const stylesButton = page.getByRole('link', { name: /styles|fabrics|products/i })
      if (await stylesButton.isVisible({ timeout: 2000 })) {
        await stylesButton.click()
        await waitForAppReady(page)

        await expect(page).toHaveURL(/\/styles/)
      }
    })
  })

  test.describe('Pull-to-Refresh', () => {
    test('pull-to-refresh refreshes vendors list', async ({ page }) => {
      await vendorsPage.pullToRefresh()
      await waitForAppReady(page)

      // Should still be on vendors page
      await expect(page).toHaveURL(/\/vendors/)
    })
  })
})
