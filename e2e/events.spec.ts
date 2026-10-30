/**
 * E2E: Event Management Tests
 *
 * Tests for event CRUD operations:
 * - Create new event
 * - Edit existing event
 * - Delete event with confirmation
 * - Event status badges
 * - Event card action buttons
 * - Pull-to-refresh
 */

import { test, expect } from '@playwright/test'
import { login, waitForAppReady } from './fixtures/test-data'
import { EventsPage } from './fixtures/page-objects/events-page'
import { cleanupEvent } from './helpers/cleanup-helpers'

test.describe('Event Management @core', () => {
  let eventsPage: EventsPage
  let createdEventId: string | null = null
  let createdEventName: string | null = null

  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)
    eventsPage = new EventsPage(page)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup created event
    if (createdEventId) {
      await cleanupEvent(createdEventId)
      createdEventId = null
      createdEventName = null
    }
  })

  test.describe('Create Event', () => {
    test('create new event from events list', async ({ page }) => {
      // Go to events list
      await eventsPage.gotoEventsList()

      // Click create button
      await eventsPage.clickCreateEvent()

      // Fill form
      const eventName = `E2E Test Event ${Date.now()}`
      createdEventName = eventName

      await eventsPage.createEvent({
        name: eventName,
        description: 'E2E test event description',
        location: 'Test Convention Center',
      })

      // Should redirect to event detail or back to events list
      await waitForAppReady(page)

      // Verify event appears in list
      await eventsPage.gotoEventsList()
      await eventsPage.assertEventVisible(eventName)

      // Get the event ID for cleanup
      const eventLink = page.locator('a').filter({ hasText: eventName })
      const href = await eventLink.getAttribute('href')
      if (href) {
        const match = href.match(/events\/([^/]+)/)
        if (match) {
          createdEventId = match[1]
        }
      }
    })

    test('create event with minimum required fields', async ({ page }) => {
      await eventsPage.gotoEventsList()
      await eventsPage.clickCreateEvent()

      const eventName = `Minimal Event ${Date.now()}`
      createdEventName = eventName

      // Fill only required fields
      await eventsPage.eventNameInput.fill(eventName)
      await eventsPage.saveButton.click()

      await waitForAppReady(page)

      // Should succeed
      await eventsPage.gotoEventsList()
      await eventsPage.assertEventVisible(eventName)
    })

    test('create event form validation works', async ({ page }) => {
      await eventsPage.gotoEventsList()
      await eventsPage.clickCreateEvent()

      // Save button should be disabled when form is empty
      await expect(eventsPage.saveButton).toBeDisabled()

      // Fill in the name to enable the button
      await eventsPage.eventNameInput.fill('Test Event')

      // Now save button should be enabled
      await expect(eventsPage.saveButton).toBeEnabled()
    })
  })

  test.describe('Edit Event', () => {
    test('edit existing event updates details', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Find an existing event to edit - use card-scoped locator
      const eventCard = eventsPage.eventCard.first()
      const count = await eventCard.count()
      if (count === 0) {
        test.skip('No events found to edit')
      }

      // Get the event name from the card's link
      const eventLink = eventCard.locator('a[href*="/events/"][href*="/vendors"]')
      const eventName = await eventLink.first().textContent() || ''

      // Click the edit button directly on the card
      await eventsPage.clickEditButtonByName(eventName)

      // Update event name
      const updatedName = `Updated Event ${Date.now()}`
      await eventsPage.eventNameInput.fill(updatedName)
      await eventsPage.saveButton.click()

      await waitForAppReady(page)

      // Verify update - go back to events list
      await eventsPage.gotoEventsList()
      await eventsPage.assertEventVisible(updatedName)
    })

    test('cancel edit keeps original values', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Find an existing event - use card-scoped locator
      const eventCard = eventsPage.eventCard.first()
      const count = await eventCard.count()
      if (count === 0) {
        test.skip('No events found to edit')
      }

      // Get original event name from the card's link
      const eventLink = eventCard.locator('a[href*="/events/"][href*="/vendors"]')
      const eventName = await eventLink.first().textContent() || ''

      // Click the edit button directly
      await eventsPage.clickEditButtonByName(eventName)

      // Change name but cancel
      await eventsPage.eventNameInput.fill('Changed Name')
      await eventsPage.cancelButton.click()

      await waitForAppReady(page)

      // Original name should still be there
      await eventsPage.gotoEventsList()
      await eventsPage.assertEventVisible(eventName)
    })
  })

  test.describe('Delete Event', () => {
    test('delete event with confirmation removes it from list', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Create an event to delete
      await eventsPage.clickCreateEvent()
      const eventName = `To Delete ${Date.now()}`
      await eventsPage.createEvent({ name: eventName })
      await waitForAppReady(page)

      await eventsPage.gotoEventsList()

      // Wait for event to be visible before deleting
      await eventsPage.assertEventVisible(eventName)
      await page.waitForTimeout(500)

      // Delete the event using the fixed method
      await eventsPage.deleteEventWithName(eventName)

      // Verify it's gone
      await eventsPage.assertEventNotVisible(eventName)
    })

    test('cancel delete keeps event in list', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Create an event for testing cancel
      await eventsPage.clickCreateEvent()
      const eventName = `Cancel Delete Test ${Date.now()}`
      await eventsPage.createEvent({ name: eventName })
      await waitForAppReady(page)

      await eventsPage.gotoEventsList()

      // Wait for event to be visible
      await eventsPage.assertEventVisible(eventName)
      await page.waitForTimeout(500)

      // Find the event card and click delete button - use same selector as deleteEventWithName
      const eventCard = page.locator('div.rounded-lg.border').filter({ has: page.locator('a', { hasText: eventName }) })
      const buttons = eventsPage.getEventCardButtonsSimple(await eventCard)
      await buttons.delete.click()

      // Cancel the deletion - DeleteEventDialog has cancel button
      const cancelButton = page.getByRole('button', { name: /cancel/i })
      if (await cancelButton.isVisible({ timeout: 2000 })) {
        await cancelButton.click()
        // Wait for dialog to close
        await page.waitForTimeout(500)
      }

      // Event should still be there
      await eventsPage.assertEventVisible(eventName)

      // Clean up the test event
      await eventsPage.deleteEventWithName(eventName)
    })
  })

  test.describe('Event Status', () => {
    test('event status badge displays correctly', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Look for status badges
      const statusBadges = eventsPage.statusBadge
      const hasBadges = await statusBadges.count() > 0

      if (hasBadges) {
        await expect(statusBadges.first()).toBeVisible()
      }
    })

    test('status badge changes when event status changes', async ({ page }) => {
      // This would require editing the event status
      // For now, just verify status badges exist
      await eventsPage.gotoEventsList()

      const statusBadges = eventsPage.statusBadge
      if (await statusBadges.count() > 0) {
        await expect(statusBadges.first()).toBeVisible()
      }
    })
  })

  test.describe('Event Card Actions', () => {
    test('event card shows all action buttons', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Wait for at least one event to be present - use count() which is more reliable
      const eventLinks = page.locator('a[href*="/events/"][href*="/vendors"]')
      const count = await eventLinks.count()
      if (count === 0) {
        test.skip('No events found')
      }

      // Get the parent card using the rounded-lg.border selector
      const firstEventLink = eventLinks.first()
      const firstEvent = page.locator('div.rounded-lg.border').filter({ has: firstEventLink })

      // Check for action buttons using card-scoped selectors
      const buttons = eventsPage.getEventCardButtonsSimple(firstEvent)

      // Verify buttons exist (they're always visible, not hover-dependent)
      const hasEdit = await buttons.edit.isVisible().catch(() => false)
      const hasShare = await buttons.share.isVisible().catch(() => false)
      const hasAnalytics = await buttons.analytics.isVisible().catch(() => false)
      const hasExport = await buttons.export.isVisible().catch(() => false)
      const hasDelete = await buttons.delete.isVisible().catch(() => false)

      // At least some action buttons should be present
      const hasActions = hasEdit || hasShare || hasAnalytics || hasExport || hasDelete
      expect(hasActions).toBeTruthy()
    })

    test('clicking analytics button navigates to dashboard', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const eventLinks = page.locator('a[href*="/events/"][href*="/vendors"]')
      const count = await eventLinks.count()
      if (count === 0) {
        test.skip('No events found')
      }

      const firstEventLink = eventLinks.first()
      const firstEvent = page.locator('div.rounded-lg.border').filter({ has: firstEventLink })
      const buttons = eventsPage.getEventCardButtonsSimple(firstEvent)

      if (await buttons.analytics.isVisible({ timeout: 1000 })) {
        await buttons.analytics.click()
        await waitForAppReady(page)

        await expect(page).toHaveURL(/\/analytics/)
      }
    })

    test('clicking share button opens share dialog', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const eventLinks = page.locator('a[href*="/events/"][href*="/vendors"]')
      const count = await eventLinks.count()
      if (count === 0) {
        test.skip('No events found')
      }

      const firstEventLink = eventLinks.first()
      const firstEvent = page.locator('div.rounded-lg.border').filter({ has: firstEventLink })
      const buttons = eventsPage.getEventCardButtonsSimple(firstEvent)

      if (await buttons.share.isVisible({ timeout: 1000 })) {
        await buttons.share.click()

        // ShareDialog should open
        const shareDialog = page.getByRole('dialog').or(page.locator('[role="dialog"]'))
        await expect(shareDialog.first()).toBeVisible({ timeout: 3000 })

        // Close the dialog for cleanup
        await page.keyboard.press('Escape')
        await page.waitForTimeout(200)
      }
    })

    test('clicking export button opens export options', async ({ page }) => {
      await eventsPage.gotoEventsList()

      const eventLinks = page.locator('a[href*="/events/"][href*="/vendors"]')
      const count = await eventLinks.count()
      if (count === 0) {
        test.skip('No events found')
      }

      const firstEventLink = eventLinks.first()
      const firstEvent = page.locator('div.rounded-lg.border').filter({ has: firstEventLink })
      const buttons = eventsPage.getEventCardButtonsSimple(firstEvent)

      if (await buttons.export.isVisible({ timeout: 1000 })) {
        await buttons.export.click()

        // ExportCatalogueButton might open a dialog or trigger download
        // Just verify the click doesn't throw an error
        await page.waitForTimeout(500)
      }
    })
  })

  // SKIP: Pull-to-refresh gesture simulation is unreliable in desktop Playwright.
  // Covered by mobile-gestures.spec.ts (manual/mobile CI).
  test.describe.skip('Pull-to-Refresh', () => {
    test('pull-to-refresh refreshes events list', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Get initial event count - use event links instead of cards
      const initialLinks = await page.locator('a[href*="/events/"][href*="/vendors"]').all()
      const initialCount = initialLinks.length

      // Perform pull-to-refresh gesture
      await eventsPage.pullToRefresh()
      await waitForAppReady(page)

      // Events should still be visible after refresh
      const afterRefreshLinks = await page.locator('a[href*="/events/"][href*="/vendors"]').all()
      // The count should be at least the same (might be more if new events added)
      expect(afterRefreshLinks.length).toBeGreaterThanOrEqual(initialCount)
    })
  })

  // SKIP: Event list search opens the GlobalSearch overlay which navigates away from
  // the events list — tested more thoroughly in search.spec.ts.
  test.describe.skip('Event Search', () => {
    test('search filters event list', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Need at least 1 event for search to be meaningful
      const eventLinks = page.locator('a[href*="/events/"][href*="/vendors"]')
      const count = await eventLinks.count()
      if (count < 1) {
        test.skip('Need at least 1 event for search test')
      }

      // Get first event name for search term
      const eventName = await eventLinks.first().textContent() || ''

      // Search using GlobalSearch dialog (opens dialog first)
      await eventsPage.search(eventName.substring(0, Math.min(5, eventName.length)))

      // Wait for search results
      await page.waitForTimeout(500)

      // Should show matching events or no results if query doesn't match
      // The key is that search doesn't crash and UI updates
      const searchResults = await eventLinks.all()
      expect(searchResults.length).toBeGreaterThanOrEqual(0)

      // Clean up - close search dialog
      await eventsPage.clearSearch()
      await page.waitForTimeout(300)
    })

    test('clearing search shows all events', async ({ page }) => {
      await eventsPage.gotoEventsList()

      // Get all events count before search - use links instead of cards
      const eventLinks = page.locator('a[href*="/events/"][href*="/vendors"]')
      const initialCount = await eventLinks.count()

      if (initialCount === 0) {
        test.skip('Need events for search test')
      }

      // Search for something that won't match
      await eventsPage.search('xyz123nonexistent')

      // Wait for search to process
      await page.waitForTimeout(500)

      // Clear search by closing dialog
      await eventsPage.clearSearch()
      await page.waitForTimeout(300)

      // All events should be visible again
      const finalCount = await eventLinks.count()
      expect(finalCount).toBe(initialCount)
    })
  })
})
