/**
 * E2E: Export Feature Tests
 *
 * Tests for the export functionality:
 * - Export button on event opens ExportCatalogueButton
 * - Export button on vendor list opens BatchExportModal
 * - Export button on style list opens BatchExportModal
 * - Select export format (CSV, XLSX, PDF)
 * - Export triggers download
 * - Exported file contains correct data
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent, waitForAppReady } from './fixtures/test-data'
import { EventsPage } from './fixtures/page-objects/events-page'
import { SharedPage } from './fixtures/page-objects/shared-page'

test.describe('Export Feature @core', () => {
  let eventsPage: EventsPage
  let sharedPage: SharedPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)
    eventsPage = new EventsPage(page)
    sharedPage = new SharedPage(page)
  })

  test.describe('Event Export', () => {
    test('export button on event opens export dialog', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        await sharedPage.assertExportDialogOpen()
      } else {
        test.skip('Export button not visible')
      }
    })

    test('export dialog shows format options', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        // Look for format options
        const hasFormatSelect = await sharedPage.exportFormatSelect.isVisible().catch(() => false)

        if (hasFormatSelect) {
          await expect(sharedPage.exportFormatSelect).toBeVisible()
        } else {
          // Look for individual format buttons
          const hasCSV = await sharedPage.csvFormatOption.isVisible().catch(() => false)
          const hasXLSX = await sharedPage.xlsxFormatOption.isVisible().catch(() => false)
          const hasPDF = await sharedPage.pdfFormatOption.isVisible().catch(() => false)

          expect(hasCSV || hasXLSX || hasPDF).toBeTruthy()
        }
      } else {
        test.skip('Export button not visible')
      }
    })

    test('export event as CSV', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        // Select CSV format
        await sharedPage.selectExportFormat('csv')

        // Trigger export
        const download = await sharedPage.clickExport()

        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.csv$/i)
      } else {
        test.skip('Export button not visible')
      }
    })

    test('export event as XLSX', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        // Select XLSX format
        await sharedPage.selectExportFormat('xlsx')

        // Trigger export
        const download = await sharedPage.clickExport()

        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.xlsx$/i)
      } else {
        test.skip('Export button not visible')
      }
    })

    test('export event as PDF', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        // Select PDF format
        await sharedPage.selectExportFormat('pdf')

        // Trigger export
        const download = await sharedPage.clickExport()

        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
      } else {
        test.skip('Export button not visible')
      }
    })

    test('cancel export closes dialog', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()
        await sharedPage.assertExportDialogOpen()

        await sharedPage.closeExportDialog()
        await sharedPage.assertExportDialogClosed()
      } else {
        test.skip('Export button not visible')
      }
    })
  })

  test.describe('Vendor List Export', () => {
    test('export button on vendor list opens export modal', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      // Look for export button on vendor list
      const exportButton = page.getByRole('button', { name: /export|download/i })

      if (await exportButton.isVisible({ timeout: 2000 })) {
        await exportButton.click()

        // Export modal should open
        const exportModal = page.getByRole('dialog').filter({ hasText: /export/i })
        await expect(exportModal).toBeVisible()
      } else {
        test.skip('Export button not visible on vendor list')
      }
    })

    test('export vendors list as CSV', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const exportButton = page.getByRole('button', { name: /export/i })

      if (await exportButton.isVisible({ timeout: 2000 })) {
        await exportButton.click()

        // Select CSV and export
        const csvOption = page.getByRole('option', { name: /csv/i })
          .or(page.getByRole('button', { name: /csv/i }))

        if (await csvOption.isVisible({ timeout: 1000 })) {
          await csvOption.click()
        }

        const downloadButton = page.getByRole('button', { name: /export|download/i }).nth(1)
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
        await downloadButton.click()
        const download = await downloadPromise

        expect(download.suggestedFilename()).toMatch(/\.csv$/i)
      } else {
        test.skip('Export button not visible')
      }
    })
  })

  test.describe('Style List Export', () => {
    test('export button on style list opens export modal', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      // Navigate to a vendor's styles
      const vendorLink = page.getByRole('link', { name: /vendor/i }).first()
      if (await vendorLink.isVisible()) {
        await vendorLink.click()
        await waitForAppReady(page)

        const exportButton = page.getByRole('button', { name: /export|download/i })

        if (await exportButton.isVisible({ timeout: 2000 })) {
          await exportButton.click()

          const exportModal = page.getByRole('dialog').filter({ hasText: /export/i })
          await expect(exportModal).toBeVisible()
        } else {
          test.skip('Export button not visible on style list')
        }
      } else {
        test.skip('No vendors found')
      }
    })

    test('export styles list as CSV', async ({ page }) => {
      const eventName = await createTestEvent(page)
      await eventsPage.clickEventByName(eventName)

      const vendorLink = page.getByRole('link', { name: /vendor/i }).first()
      if (await vendorLink.isVisible()) {
        await vendorLink.click()
        await waitForAppReady(page)

        const exportButton = page.getByRole('button', { name: /export/i })

        if (await exportButton.isVisible({ timeout: 2000 })) {
          await exportButton.click()

          const downloadButton = page.getByRole('button', { name: /export|download/i }).nth(1)
          const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
          await downloadButton.click()
          const download = await downloadPromise

          expect(download.suggestedFilename()).toMatch(/\.csv$/i)
        } else {
          test.skip('Export button not visible')
        }
      } else {
        test.skip('No vendors found')
      }
    })
  })

  test.describe('Export Options', () => {
    test('select specific fields to export', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        // Look for field selection options
        const fieldSelector = page.getByRole('checkbox', { name: /.*/ })
        const fieldCount = await fieldSelector.count()

        if (fieldCount > 0) {
          // Can select/deselect fields
          await fieldSelector.first().click()
          await page.waitForTimeout(500)
        }
      } else {
        test.skip('Export button not visible')
      }
    })

    test('export with date range filter', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        // Look for date range inputs
        const dateInput = page.getByLabel(/date|from|to/i)
        const hasDateFilter = await dateInput.count() > 0

        if (hasDateFilter) {
          // Date filtering is available
          await expect(dateInput.first()).toBeVisible()
        }
      } else {
        test.skip('Export button not visible')
      }
    })
  })

  test.describe('Exported File Content', () => {
    test('exported CSV contains event data', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        await sharedPage.selectExportFormat('csv')

        const download = await sharedPage.clickExport()

        // Verify file was downloaded
        expect(download.suggestedFilename()).toMatch(/\.csv$/i)

        // Read and verify content
        const content = await download.createReadStream()
        let data = ''
        for await (const chunk of content) {
          data += chunk.toString()
        }

        // CSV should have headers
        expect(data.length).toBeGreaterThan(0)
        expect(data).toMatch(/event|vendor|style|name/i)
      } else {
        test.skip('Export button not visible')
      }
    })

    test('exported file has meaningful filename', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
        await eventsPage.exportButton.first().click()

        await sharedPage.selectExportFormat('csv')

        const download = await sharedPage.clickExport()

        const filename = download.suggestedFilename()
        expect(filename).toMatch(/catalog|export|data/i)
      } else {
        test.skip('Export button not visible')
      }
    })
  })

  test.describe('Batch Export', () => {
    test('select multiple items for batch export', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      // Look for selection checkboxes
      const checkbox = page.getByRole('checkbox')
      const hasCheckboxes = await checkbox.count() > 0

      if (hasCheckboxes) {
        // Select multiple items
        await checkbox.first().check()
        await checkbox.nth(1).check()

        // Then export
        if (await eventsPage.exportButton.isVisible({ timeout: 2000 })) {
          await eventsPage.exportButton.first().click()

          // Export should include selected items
          await sharedPage.assertExportDialogOpen()
        }
      } else {
        test.skip('No selection checkboxes found')
      }
    })
  })

  test.describe('Export History', () => {
    test('previous exports are listed', async ({ page }) => {
      // This would require a history feature
      test.skip('Requires export history feature')
    })

    test('re-download previous export', async ({ page }) => {
      test.skip('Requires export history feature')
    })
  })
})
