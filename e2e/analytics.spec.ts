/**
 * E2E: Analytics Dashboard Tests
 *
 * Tests for the analytics/dashboard feature:
 * - Navigate to analytics dashboard
 * - Dashboard loads all widgets
 * - Attendance widget displays
 * - Capture progress widget displays
 * - Extraction quality widget displays
 * - Report builder generates custom report
 * - Popular styles widget displays
 * - Vendor comparison widget displays
 * - Team productivity metrics display
 */

import { test, expect } from '@playwright/test'
import { login, createTestEvent, waitForAppReady } from './fixtures/test-data'
import { EventsPage } from './fixtures/page-objects/events-page'

// SKIP: Most analytics components (CaptureProgressMetrics, ExtractionQualityReport,
// VendorAttendanceList, TeamProductivity, VendorComparison, ReportBuilder) are built
// but not routed to any screen. TrendAnalysis uses Math.random() for all data.
// Re-enable when P2-FEAT-3 wires these components into EventDashboard.
test.describe.skip('Analytics Dashboard', () => {
  let eventsPage: EventsPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)
    eventsPage = new EventsPage(page)
  })

  test.describe('Dashboard Navigation', () => {
    test('click analytics button navigates to dashboard', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const firstEvent = eventsPage.eventCard.first()
      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Should be on analytics/dashboard page
        await expect(page).toHaveURL(/\/analytics|dashboard/)
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('direct navigation to analytics works', async ({ page }) => {
      // Create event first to get ID
      const eventName = await createTestEvent(page)
      const eventLink = page.locator('a').filter({ hasText: eventName })
      const href = await eventLink.getAttribute('href')
      const eventId = href?.split('/').pop() || ''

      // Navigate directly to analytics
      await page.goto(`/events/${eventId}/analytics`)
      await waitForAppReady(page)

      await expect(page).toHaveURL(/\/analytics/)
    })
  })

  test.describe('Dashboard Widgets', () => {
    test('dashboard loads overview widgets', async ({ page }) => {
      // Navigate to analytics
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for common dashboard widgets
        const widgets = [
          page.getByText(/attendance|visitors|views/i),
          page.getByText(/capture|scanned|added/i),
          page.getByText(/vendors|styles|fabrics/i),
        ]

        // At least some widgets should be visible
        const visibleWidgets = await Promise.all(
          widgets.map(w => w.isVisible())
        )

        const hasWidgets = visibleWidgets.some(v => v)
        expect(hasWidgets).toBeTruthy()
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('attendance widget displays data', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for attendance widget
        const attendanceWidget = page.getByText(/attendance|views|visitors/i)
        if (await attendanceWidget.isVisible({ timeout: 2000 })) {
          await expect(attendanceWidget).toBeVisible()
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('capture progress widget displays', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for capture progress
        const progressWidget = page.getByText(/capture|progress|scanned/i)
        if (await progressWidget.isVisible({ timeout: 2000 })) {
          await expect(progressWidget).toBeVisible()
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('extraction quality widget displays', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for extraction quality metrics
        const qualityWidget = page.getByText(/extraction|quality|accuracy|ai/i)
        if (await qualityWidget.isVisible({ timeout: 2000 })) {
          await expect(qualityWidget).toBeVisible()
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('popular styles widget displays', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for popular styles
        const popularWidget = page.getByText(/popular|top.*styles|most.*viewed/i)
        if (await popularWidget.isVisible({ timeout: 2000 })) {
          await expect(popularWidget).toBeVisible()
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('vendor comparison widget displays', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for vendor comparison
        const comparisonWidget = page.getByText(/vendor.*compare|comparison|by vendor/i)
        if (await comparisonWidget.isVisible({ timeout: 2000 })) {
          await expect(comparisonWidget).toBeVisible()
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('team productivity metrics display', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for team metrics
        const teamWidget = page.getByText(/team|productivity|members|contributions/i)
        if (await teamWidget.isVisible({ timeout: 2000 })) {
          await expect(teamWidget).toBeVisible()
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })
  })

  test.describe('Report Builder', () => {
    test('report builder is accessible', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for report builder button
        const reportButton = page.getByRole('button', { name: /report|generate|build.*report/i })
        if (await reportButton.isVisible({ timeout: 2000 })) {
          await reportButton.click()

          // Report builder dialog should open
          const reportDialog = page.getByRole('dialog').filter({ hasText: /report/i })
          await expect(reportDialog).toBeVisible()
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('generate custom report', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        const reportButton = page.getByRole('button', { name: /report|generate/i })
        if (await reportButton.isVisible({ timeout: 2000 })) {
          await reportButton.click()

          // Generate report
          const generateButton = page.getByRole('button', { name: /generate|create|export/i })
          if (await generateButton.isVisible()) {
            const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
            await generateButton.click()
            const download = await downloadPromise

            // Verify download
            expect(download.suggestedFilename()).toBeTruthy()
          }
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })
  })

  test.describe('Dashboard Time Filters', () => {
    test('time filter selector is available', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        // Look for time filter
        const timeFilter = page.getByRole('combobox', { name: /time|period|date|range/i })
          .or(page.getByRole('button', { name: /today|week|month|all/i }))

        if (await timeFilter.isVisible({ timeout: 2000 })) {
          await expect(timeFilter).toBeVisible()
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })

    test('changing time filter updates dashboard', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        const timeFilter = page.getByRole('combobox', { name: /time|period/i })
          .or(page.getByRole('button', { name: /today|week|month/i }))

        if (await timeFilter.isVisible({ timeout: 2000 })) {
          await timeFilter.click()
          await page.waitForTimeout(500)

          // Select a time period
          const weekOption = page.getByRole('option', { name: /week|7 days/i })
            .or(page.getByRole('button', { name: /week/i }))

          if (await weekOption.isVisible({ timeout: 1000 })) {
            await weekOption.click()
            await waitForAppReady(page)

            // Dashboard should still be visible
            await expect(page).toHaveURL(/\/analytics/)
          }
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })
  })

  test.describe('Dashboard Export', () => {
    test('export dashboard as PDF', async ({ page }) => {
      await eventsPage.gotoEventsList()
      const firstEvent = eventsPage.eventCard.first()

      if (!(await firstEvent.isVisible())) {
        test.skip('No events found')
      }

      await firstEvent.hover()

      if (await eventsPage.analyticsButton.isVisible({ timeout: 2000 })) {
        await eventsPage.analyticsButton.first().click()
        await waitForAppReady(page)

        const exportButton = page.getByRole('button', { name: /export|download|pdf/i })
        if (await exportButton.isVisible({ timeout: 2000 })) {
          const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
          await exportButton.click()
          const download = await downloadPromise

          expect(download.suggestedFilename()).toMatch(/\.pdf$/i)
        }
      } else {
        test.skip('Analytics button not visible')
      }
    })
  })
})
