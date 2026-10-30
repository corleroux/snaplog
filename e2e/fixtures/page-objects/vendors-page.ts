/**
 * Vendors Page Object Model
 *
 * Selectors and methods for vendor-related pages:
 * - Vendors List
 * - Vendor Detail
 * - Vendor Capture
 * - Vendor Edit
 */

import { type Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class VendorsPage extends BasePage {
  // Vendors list selectors
  readonly vendorsList: Locator
  readonly vendorCard: Locator
  readonly addVendorButton: Locator
  readonly searchInput: Locator
  readonly filterButton: Locator

  // Vendor card actions
  readonly viewButton: Locator
  readonly editVendorButton: Locator
  readonly deleteVendorButton: Locator

  // Vendor detail selectors
  readonly vendorName: Locator
  readonly vendorBooth: Locator
  readonly vendorEmail: Locator
  readonly vendorPhone: Locator
  readonly vendorWebsite: Locator
  readonly vendorAddress: Locator
  readonly viewStylesButton: Locator

  // Capture/Edit form selectors
  readonly companyNameInput: Locator
  readonly boothInput: Locator
  readonly contactNameInput: Locator
  readonly emailInput: Locator
  readonly phoneInput: Locator
  readonly websiteInput: Locator
  readonly addressInput: Locator
  readonly notesInput: Locator
  readonly imageUpload: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator

  // Status selectors
  readonly activeStatusToggle: Locator
  readonly archivedBadge: Locator

  constructor(page: Page) {
    super(page)

    // Vendors list
    this.vendorsList = page.getByTestId('vendors-list').or(page.locator('[data-testid*="vendor"]'))
    this.vendorCard = page.getByTestId(/vendor-card|vendor-item/).or(page.locator('.vendor-card, [class*="vendorCard"]'))
    this.addVendorButton = page.getByRole('button', { name: /add|create|new.*vendor|capture/i })
    this.searchInput = page.getByPlaceholder(/search|filter/i)
    this.filterButton = page.getByRole('button', { name: /filter|sort/i })

    // Vendor card actions
    this.viewButton = page.getByRole('link', { name: /view|details/i })
    this.editVendorButton = page.getByRole('button', { name: /edit/i })
    this.deleteVendorButton = page.getByRole('button', { name: /delete|remove/i })

    // Vendor detail
    this.vendorName = page.getByTestId('vendor-name').or(page.locator('h1, h2').filter({ hasText: /.*/ }))
    this.vendorBooth = page.getByText(/booth|stand/i)
    this.vendorEmail = page.locator('a[href^="mailto:"]')
    this.vendorPhone = page.getByText(/phone|tel/i)
    this.vendorWebsite = page.locator('a[href^="http"]').filter({ hasText: /^http/ })
    this.vendorAddress = page.getByText(/address|location/i)
    this.viewStylesButton = page.getByRole('link', { name: /styles|fabrics|products/i })

    // Capture/Edit form
    this.companyNameInput = page.getByLabel(/company|name|organization/i)
    this.boothInput = page.getByLabel(/booth|stand/i)
    this.contactNameInput = page.getByLabel(/contact|person/i)
    this.emailInput = page.getByLabel(/email/i)
    this.phoneInput = page.getByLabel(/phone|tel/i)
    this.websiteInput = page.getByLabel(/website|url/i)
    this.addressInput = page.getByLabel(/address|location/i)
    this.notesInput = page.getByLabel(/notes|comments/i)
    this.imageUpload = page.locator('input[type="file"]').or(page.getByLabel(/upload|photo|image/i))
    this.saveButton = page.getByRole('button', { name: /save|commit|submit|create/i })
    this.cancelButton = page.getByRole('button', { name: /cancel/i })

    // Status
    this.activeStatusToggle = page.getByRole('switch', { name: /active|status/i })
    this.archivedBadge = page.getByText(/archived|inactive/i)
  }

  /**
   * Navigate to vendors list for an event
   */
  async gotoVendorsList(eventId: string) {
    await this.goto(`/events/${eventId}/vendors`)
    await this.waitForReady()
  }

  /**
   * Navigate to vendor detail
   */
  async gotoVendorDetail(eventId: string, vendorId: string) {
    await this.goto(`/events/${eventId}/vendors/${vendorId}`)
    await this.waitForReady()
  }

  /**
   * Navigate to vendor capture
   */
  async gotoVendorCapture(eventId: string) {
    await this.goto(`/events/${eventId}/vendors/capture`)
    await this.waitForReady()
  }

  /**
   * Navigate to vendor edit
   */
  async gotoVendorEdit(eventId: string, vendorId: string) {
    await this.goto(`/events/${eventId}/vendors/${vendorId}/edit`)
    await this.waitForReady()
  }

  /**
   * Click add vendor button
   */
  async clickAddVendor() {
    await this.clickAndWait(this.addVendorButton)
  }

  /**
   * Fill vendor form and submit
   */
  async fillVendorForm(data: {
    company: string
    booth?: string
    contact?: string
    email?: string
    phone?: string
    website?: string
    address?: string
    notes?: string
  }) {
    await this.companyNameInput.fill(data.company)
    if (data.booth && await this.boothInput.isVisible()) {
      await this.boothInput.fill(data.booth)
    }
    if (data.contact && await this.contactNameInput.isVisible()) {
      await this.contactNameInput.fill(data.contact)
    }
    if (data.email && await this.emailInput.isVisible()) {
      await this.emailInput.fill(data.email)
    }
    if (data.phone && await this.phoneInput.isVisible()) {
      await this.phoneInput.fill(data.phone)
    }
    if (data.website && await this.websiteInput.isVisible()) {
      await this.websiteInput.fill(data.website)
    }
    if (data.address && await this.addressInput.isVisible()) {
      await this.addressInput.fill(data.address)
    }
    if (data.notes && await this.notesInput.isVisible()) {
      await this.notesInput.fill(data.notes)
    }
  }

  /**
   * Upload vendor image
   */
  async uploadImage(filePath: string) {
    const fileInput = this.page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(filePath)
    } else {
      await this.imageUpload.click()
      await this.page.waitForTimeout(500)
      await fileInput.setInputFiles(filePath)
    }
  }

  /**
   * Click on a vendor card by name
   */
  async clickVendorByName(name: string) {
    const vendorLink = this.vendorCard.filter({ hasText: name }).first()
    await this.clickAndWait(vendorLink)
  }

  /**
   * Assert vendor with name is visible in list
   */
  async assertVendorVisible(name: string) {
    await expect(this.vendorCard.filter({ hasText: name })).toBeVisible()
  }

  /**
   * Assert vendor with name is not visible in list
   */
  async assertVendorNotVisible(name: string) {
    await expect(this.vendorCard.filter({ hasText: name })).not.toBeVisible()
  }

  /**
   * Search for a vendor
   */
  async search(query: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query)
      await this.waitForReady()
    }
  }

  /**
   * Swipe left on vendor card to reveal edit
   */
  async swipeLeftToEdit(vendorName: string) {
    const card = this.vendorCard.filter({ hasText: vendorName })
    const box = await card.boundingBox()
    if (box) {
      const startX = box.x + box.width * 0.8
      const endX = box.x + box.width * 0.2
      const centerY = box.y + box.height / 2
      await this.page.touchscreen.tap(startX, centerY)
      await this.page.mouse.move(startX, centerY)
      await this.page.mouse.down()
      await this.page.mouse.move(endX, centerY, { steps: 10 })
      await this.page.mouse.up()
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Swipe right on vendor card to reveal delete
   */
  async swipeRightToDelete(vendorName: string) {
    const card = this.vendorCard.filter({ hasText: vendorName })
    const box = await card.boundingBox()
    if (box) {
      const startX = box.x + box.width * 0.2
      const endX = box.x + box.width * 0.8
      const centerY = box.y + box.height / 2
      await this.page.touchscreen.tap(startX, centerY)
      await this.page.mouse.move(startX, centerY)
      await this.page.mouse.down()
      await this.page.mouse.move(endX, centerY, { steps: 10 })
      await this.page.mouse.up()
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Delete vendor with confirmation
   */
  async deleteVendorWithName(name: string) {
    const vendorCard = this.vendorCard.filter({ hasText: name })
    await vendorCard.hover()
    const deleteBtn = vendorCard.locator(this.deleteVendorButton)
    await deleteBtn.click()
    const confirmButton = this.page.getByRole('button', { name: /confirm|delete|yes/i })
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click()
    }
    await this.waitForReady()
  }

  /**
   * Perform pull-to-refresh on vendors list
   */
  async pullToRefresh() {
    const boundingBox = await this.vendorsList.boundingBox()
    if (boundingBox) {
      const startY = boundingBox.y + boundingBox.height / 2
      const endY = startY + 200
      await this.page.mouse.move(boundingBox.x + boundingBox.width / 2, startY)
      await this.page.mouse.down()
      await this.page.mouse.move(boundingBox.x + boundingBox.width / 2, endY, { steps: 10 })
      await this.page.mouse.up()
      await this.waitForReady()
    }
  }

  /**
   * Click export vendors button
   */
  async clickExport() {
    await this.exportButton.click()
  }

  /**
   * Get vendor detail text
   */
  async getVendorName(): Promise<string | null> {
    return await this.vendorName.first().textContent()
  }
}
