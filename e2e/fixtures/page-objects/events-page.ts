/**
 * Events Page Object Model
 *
 * Selectors and methods for events-related pages:
 * - Events List (dashboard)
 * - Event Create
 * - Event Edit
 * - Event Analytics
 */

import { type Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class EventsPage extends BasePage {
  // Events list selectors
  readonly eventsList: Locator
  readonly eventCard: Locator
  readonly createEventButton: Locator
  readonly searchButton: Locator

  // Create/Edit form selectors
  readonly eventNameInput: Locator
  readonly eventDescriptionInput: Locator
  readonly eventStartDateInput: Locator
  readonly eventEndDateInput: Locator
  readonly eventLocationInput: Locator
  readonly saveEventButton: Locator
  readonly cancelButton: Locator

  // Event status badge
  readonly statusBadge: Locator

  constructor(page: Page) {
    super(page)

    // Events list - Cards are wrapped in SwipeActions
    this.eventsList = page.locator('main > div > div[class*="grid"]')
    // Event cards - Card uses Tailwind classes like "rounded-lg border bg-card"
    // We identify them by finding rounded-lg divs that contain event vendor links
    this.eventCard = page.locator('div.rounded-lg.border').filter({ has: page.locator('a[href*="/events/"][href*="/vendors"]') })
    // Create event button - find by text content (handles both header and empty state buttons)
    this.createEventButton = page.getByText('New Event', { exact: true })
      .or(page.getByText('Create Event', { exact: true }))
    // Search button for GlobalSearch dialog - has text "Search..." and an SVG
    this.searchButton = page.getByRole('button').filter({ hasText: 'Search' })

    // Create/Edit form
    this.eventNameInput = page.getByLabel(/event.*name|name/i)
    this.eventDescriptionInput = page.getByLabel(/description/i)
    this.eventStartDateInput = page.getByLabel(/start.*date|from/i)
    this.eventEndDateInput = page.getByLabel(/end.*date|to/i)
    this.eventLocationInput = page.getByLabel(/location|venue/i)
    this.saveEventButton = page.getByRole('button', { name: /create|save|update/i })
    // Alias for saveButton used in tests
    this.saveButton = this.saveEventButton
    this.cancelButton = page.getByRole('button', { name: /cancel/i })

    // Status badge
    this.statusBadge = page.locator('.Badge, [class*="badge"]')
  }

  /**
   * Get action buttons for a specific event card
   * Action buttons are card-scoped icon buttons
   * lucide-react icons render as SVG, so we filter by SVG content
   */
  getEventCardButtons(eventCard: Locator) {
    // Get all icon buttons in the card header (they have size="icon-sm" class)
    const iconButtons = eventCard.locator('button[class*="icon"]')

    return {
      // First icon button (with title="View analytics" for analytics)
      analytics: iconButtons.filter({ has: this.page.locator('svg') }).first().filter({ has: this.page.locator('[title*="analytics"]') }),
      // Share button contains ShareDialog - look for button with SVG followed by dialog trigger
      share: iconButtons.filter({ has: this.page.locator('svg') }).nth(1),
      // Export button is ExportCatalogueButton - has specific class pattern
      export: eventCard.locator('button').filter({ has: this.page.locator('svg') }),
      // Delete button is last icon button
      delete: iconButtons.filter({ has: this.page.locator('svg') }).last(),
      // Edit button is second button in header
      edit: iconButtons.filter({ has: this.page.locator('svg') }).nth(0),
    }
  }

  /**
   * Get action buttons for a specific event card - simplified version
   * Uses button order in the DOM
   */
  getEventCardButtonsSimple(eventCard: Locator) {
    // All action buttons are icon-sm buttons in the card
    const allIconButtons = eventCard.locator('button').filter({ has: this.page.locator('svg') })

    return {
      // Based on EventsScreen.tsx button order: edit(1), share(2), analytics(3), export(4), delete(5)
      edit: allIconButtons.nth(0),
      share: allIconButtons.nth(1),
      analytics: allIconButtons.nth(2),
      export: allIconButtons.nth(3),
      delete: allIconButtons.nth(4),
    }
  }

  /**
   * Navigate to events list
   */
  async gotoEventsList() {
    await this.goto('/')
    await this.waitForReady()
  }

  /**
   * Navigate to events list with full storage reset
   */
  async gotoEventsListFresh() {
    // Clear all storage before navigating
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
      // Also clear IndexedDB
      indexedDB.databases().then(databases => {
        databases.forEach(database => {
          indexedDB.deleteDatabase(database.name!)
        })
      })
    })
    await this.goto('/')
    await this.waitForReady()
  }

  /**
   * Navigate to create event page
   */
  async gotoCreateEvent() {
    await this.goto('/events/new')
    await this.waitForReady()
  }

  /**
   * Navigate to edit event page
   */
  async gotoEditEvent(eventId: string) {
    await this.goto(`/events/${eventId}/edit`)
    await this.waitForReady()
  }

  /**
   * Navigate to event analytics
   */
  async gotoAnalytics(eventId: string) {
    await this.goto(`/events/${eventId}/analytics`)
    await this.waitForReady()
  }

  /**
   * Click create event button
   */
  async clickCreateEvent() {
    // Wait for button to be visible
    await this.createEventButton.waitFor({ state: 'visible', timeout: 10000 })
    await this.clickAndWait(this.createEventButton)
  }

  /**
   * Fill event form and submit
   */
  async createEvent(data: {
    name: string
    description?: string
    startDate?: string
    endDate?: string
    location?: string
  }) {
    await this.eventNameInput.fill(data.name)
    if (data.description && await this.eventDescriptionInput.isVisible()) {
      await this.eventDescriptionInput.fill(data.description)
    }
    if (data.startDate && await this.eventStartDateInput.isVisible()) {
      await this.eventStartDateInput.fill(data.startDate)
    }
    if (data.endDate && await this.eventEndDateInput.isVisible()) {
      await this.eventEndDateInput.fill(data.endDate)
    }
    if (data.location && await this.eventLocationInput.isVisible()) {
      await this.eventLocationInput.fill(data.location)
    }
    await this.clickAndWait(this.saveEventButton)
  }

  /**
   * Click on an event card by name
   */
  async clickEventByName(name: string) {
    const eventLink = this.eventCard.filter({ hasText: name }).first()
    await this.clickAndWait(eventLink)
  }

  /**
   * Get all event cards
   */
  async getEventCards() {
    return await this.eventCard.all()
  }

  /**
   * Assert event with name is visible in list
   * Uses card-scoped locator for reliability
   */
  async assertEventVisible(name: string) {
    // Find the event card that contains this event name
    const eventCard = this.getEventCardByName(name)

    // Wait for the card to be visible
    await eventCard.first().waitFor({ state: 'visible', timeout: 5000 })

    // Verify the event name link within the card
    const eventLink = eventCard.locator('a[href*="/events/"][href*="/vendors"]')
    await expect(eventLink.first()).toContainText(name)
  }

  /**
   * Assert event with name is not visible in list
   * Uses card-scoped locator for reliability
   */
  async assertEventNotVisible(name: string) {
    // Try to find the event card
    const eventCard = this.getEventCardByName(name)

    // Should not be visible (or not exist)
    await expect(eventCard.first()).not.toBeVisible({ timeout: 5000 })
  }

  /**
   * Delete event with confirmation
   */
  async deleteEventWithName(name: string) {
    // Find the card containing the event name - use the same pattern as eventCard selector
    const eventCard = this.page.locator('div.rounded-lg.border').filter({ has: this.page.locator('a', { hasText: name }) }).first()
    // Wait for the card to be visible
    await eventCard.waitFor({ state: 'visible', timeout: 5000 })
    const buttons = this.getEventCardButtonsSimple(eventCard)
    // Wait for delete button to be visible
    await buttons.delete.waitFor({ state: 'visible', timeout: 5000 })
    await buttons.delete.click()
    // Confirm deletion - DeleteEventDialog has confirm button
    const confirmButton = this.page.getByRole('button', { name: /delete|confirm/i })
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click()
      // Wait for dialog to close and delete to complete
      await this.page.waitForTimeout(500)
    }
    await this.waitForReady()
  }

  /**
   * Click analytics button on first event
   */
  async clickAnalyticsOnFirstEvent() {
    const firstEvent = this.eventCard.first()
    const buttons = this.getEventCardButtonsSimple(firstEvent)
    await buttons.analytics.click()
    await this.waitForReady()
  }

  /**
   * Click share button on first event
   */
  async clickShareOnFirstEvent() {
    const firstEvent = this.eventCard.first()
    const buttons = this.getEventCardButtonsSimple(firstEvent)
    await buttons.share.click()
  }

  /**
   * Perform pull-to-refresh gesture
   * Uses page-level scroll gesture since PullToRefresh wraps the grid
   */
  async pullToRefresh() {
    const viewportSize = this.page.viewportSize()
    if (!viewportSize) return

    const startX = viewportSize.width / 2
    const startY = 100
    const endY = startY + 300

    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()
    await this.page.mouse.move(startX, endY, { steps: 15 })
    await this.page.mouse.up()
    await this.page.waitForTimeout(1000)
    await this.waitForReady()
  }

  /**
   * Search for events using GlobalSearch dialog
   */
  async search(query: string) {
    // Click search button to open GlobalSearch dialog
    if (await this.searchButton.isVisible({ timeout: 2000 })) {
      await this.searchButton.click()
      // Wait for dialog to open
      await this.page.waitForTimeout(200)

      // Fill search input in the dialog
      const searchInput = this.page.getByPlaceholder(/search|find/i).or(this.page.getByRole('searchbox'))
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill(query)
        await this.page.waitForTimeout(300)
      }
    }
  }

  /**
   * Clear search and close GlobalSearch dialog
   */
  async clearSearch() {
    // Close dialog by clicking search button again or pressing Escape
    if (await this.searchButton.isVisible({ timeout: 2000 })) {
      await this.searchButton.click()
      await this.page.waitForTimeout(200)
    }
    // Or press Escape to ensure it's closed
    await this.page.keyboard.press('Escape')
    await this.page.waitForTimeout(200)
  }

  /**
   * Get event card by name (card-scoped for reliability)
   * Returns the card locator for further interaction
   */
  getEventCardByName(name: string) {
    // Find the card that contains the event name in its link
    // This is more reliable than finding any link with the text
    return this.eventCard.filter({ has: this.page.locator('a').filter({ hasText: name }) })
  }

  /**
   * Get event ID from event card by name
   * Extracts the event ID from the card's vendor link href
   */
  async getEventIdByName(name: string): Promise<string | null> {
    // Find the specific card for this event
    const eventCard = this.getEventCardByName(name).first()

    // Get the vendor link from this specific card (it contains the event ID in the URL)
    const vendorLink = eventCard.locator('a[href*="/events/"][href*="/vendors"]')
    const href = await vendorLink.first().getAttribute('href')

    if (href) {
      // Handle both relative URLs and absolute URLs
      // Relative: "/events/abc-123/vendors"
      // Absolute: "http://localhost:5173/events/abc-123/vendors"
      const match = href.match(/\/events\/([^/]+)/)
      return match ? match[1] : null
    }
    return null
  }

  /**
   * Navigate to edit page for an event by name
   * Uses the edit button on the event card for direct navigation
   */
  async gotoEditEventByName(name: string) {
    // Find the specific card for this event
    const eventCard = this.getEventCardByName(name).first()

    // Wait for the card to be visible
    await eventCard.waitFor({ state: 'visible', timeout: 5000 })

    // Click the edit button directly (more reliable than URL extraction)
    // The edit button is the first icon button in the card header
    const editButton = eventCard.locator('button').filter({ has: this.page.locator('svg', { hasText: 'edit' }) })

    if (await editButton.isVisible({ timeout: 2000 })) {
      await editButton.first().click()
    } else {
      // Fallback: try to extract ID and navigate directly
      const eventId = await this.getEventIdByName(name)
      if (eventId) {
        await this.goto(`/events/${eventId}/edit`)
      } else {
        throw new Error(`Could not find event with name: ${name}`)
      }
    }

    await this.waitForReady()
  }

  /**
   * Get edit button for an event by name
   * Returns the edit button locator for the specified event
   */
  getEditButtonByName(name: string) {
    const eventCard = this.getEventCardByName(name).first()

    // Try multiple strategies for finding the edit button:
    // 1. By aria-label or title (if set)
    // 2. By lucide-icon class with Edit2
    // 3. By being the first icon button in the card header
    const editByLabel = eventCard.getByRole('button', { name: /edit/i })

    // The edit button contains the Edit2 icon from lucide-react
    const editByIcon = eventCard.locator('button').filter({
      has: this.page.locator('svg').filter({ has: this.page.locator('[data-lucide="edit2"]') })
    })

    // Fallback to first icon button (edit is first in the header)
    const editByPosition = eventCard.locator('button').filter({ has: this.page.locator('svg') }).nth(0)

    // Return the most specific available locator
    return editByLabel.or(editByIcon).or(editByPosition)
  }

  /**
   * Click edit button for an event by name
   * Navigates to the edit page for the specified event
   */
  async clickEditButtonByName(name: string) {
    const editButton = this.getEditButtonByName(name)

    // Wait for the button to be visible and clickable
    await editButton.waitFor({ state: 'visible', timeout: 5000 })
    await editButton.click()

    await this.waitForReady()
  }

  /**
   * Navigate to analytics for an event by name
   */
  async gotoAnalyticsByName(name: string) {
    const eventId = await this.getEventIdByName(name)
    if (eventId) {
      await this.goto(`/events/${eventId}/analytics`)
      await this.waitForReady()
    } else {
      throw new Error(`Could not find event with name: ${name}`)
    }
  }
}
