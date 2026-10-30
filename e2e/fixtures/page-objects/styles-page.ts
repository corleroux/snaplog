/**
 * Styles (Fabric) Page Object Model
 *
 * Selectors and methods for style/fabric-related pages:
 * - Styles List
 * - Style Detail
 * - Style Capture
 * - Style Edit
 * - Variant Edit
 */

import { type Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class StylesPage extends BasePage {
  // Styles list selectors
  readonly stylesList: Locator
  readonly styleCard: Locator
  readonly addStyleButton: Locator
  readonly searchInput: Locator
  readonly filterButton: Locator

  // Style card actions
  readonly viewStyleButton: Locator
  readonly editStyleButton: Locator
  readonly deleteStyleButton: Locator

  // Style detail selectors
  readonly styleName: Locator
  readonly styleCategory: Locator
  readonly styleSeason: Locator
  readonly styleComposition: Locator
  readonly stylePrice: Locator
  readonly styleImages: Locator
  readonly variantsList: Locator
  readonly variantCard: Locator
  readonly addVariantButton: Locator

  // Capture/Edit form selectors
  readonly nameInput: Locator
  readonly categoryInput: Locator
  readonly seasonInput: Locator
  readonly compositionInput: Locator
  readonly widthInput: Locator
  readonly weightInput: Locator
  readonly priceInput: Locator
  readonly currencyInput: Locator
  readonly notesInput: Locator
  readonly imageUpload: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator

  // Variant form selectors
  readonly variantColorInput: Locator
  readonly variantSizeInput: Locator
  readonly variantSKUInput: Locator
  readonly variantStockInput: Locator
  readonly variantPriceInput: Locator
  readonly saveVariantButton: Locator

  // Status selectors
  readonly statusBadge: Locator
  readonly availableBadge: Locator
  readonly outOfStockBadge: Locator

  constructor(page: Page) {
    super(page)

    // Styles list
    this.stylesList = page.getByTestId('styles-list').or(page.locator('[data-testid*="style"], [data-testid*="fabric"]'))
    this.styleCard = page.getByTestId(/style-card|fabric-card|style-item/).or(page.locator('.style-card, .fabric-card, [class*="styleCard"]'))
    this.addStyleButton = page.getByRole('button', { name: /add|create|new.*style|capture/i })
    this.searchInput = page.getByPlaceholder(/search|filter/i)
    this.filterButton = page.getByRole('button', { name: /filter|sort/i })

    // Style card actions
    this.viewStyleButton = page.getByRole('link', { name: /view|details/i })
    this.editStyleButton = page.getByRole('button', { name: /edit/i })
    this.deleteStyleButton = page.getByRole('button', { name: /delete|remove/i })

    // Style detail
    this.styleName = page.getByTestId('style-name').or(page.locator('h1, h2'))
    this.styleCategory = page.getByText(/category|collection/i)
    this.styleSeason = page.getByText(/season|ss\d{2}|aw\d{2}/i)
    this.styleComposition = page.getByText(/composition|material|content|%/)
    this.stylePrice = page.getByText(/price|cost|msrp/i)
    this.styleImages = page.locator('img[alt*="style"], img[alt*="fabric"]')
    this.variantsList = page.getByTestId('variants-list').or(page.locator('[data-testid*="variant"]'))
    this.variantCard = page.getByTestId(/variant-card|variant-item/).or(page.locator('.variant-card, [class*="variantCard"]'))
    this.addVariantButton = page.getByRole('button', { name: /add.*variant|create.*variant/i })

    // Capture/Edit form
    this.nameInput = page.getByLabel(/style.*name|fabric.*name|name/i)
    this.categoryInput = page.getByLabel(/category|collection/i)
    this.seasonInput = page.getByLabel(/season/i)
    this.compositionInput = page.getByLabel(/composition|material|content/i)
    this.widthInput = page.getByLabel(/width/i)
    this.weightInput = page.getByLabel(/weight|gsm/i)
    this.priceInput = page.getByLabel(/price|cost/i)
    this.currencyInput = page.getByLabel(/currency/i)
    this.notesInput = page.getByLabel(/notes|comments/i)
    this.imageUpload = page.locator('input[type="file"]').or(page.getByLabel(/upload|photo|image/i))
    this.saveButton = page.getByRole('button', { name: /save|commit|submit|create/i })
    this.cancelButton = page.getByRole('button', { name: /cancel/i })

    // Variant form
    this.variantColorInput = page.getByLabel(/color|colour/i)
    this.variantSizeInput = page.getByLabel(/size/i)
    this.variantSKUInput = page.getByLabel(/sku|item.*number/i)
    this.variantStockInput = page.getByLabel(/stock|quantity|inventory/i)
    this.variantPriceInput = page.getByLabel(/price/i)
    this.saveVariantButton = page.getByRole('button', { name: /save|add|create/i })

    // Status
    this.statusBadge = page.locator('[class*="badge"], [class*="status"]')
    this.availableBadge = page.getByText(/available|in.*stock/i)
    this.outOfStockBadge = page.getByText(/out.*of.*stock|unavailable/i)
  }

  /**
   * Navigate to styles list for a vendor
   */
  async gotoStylesList(eventId: string, vendorId: string) {
    await this.goto(`/events/${eventId}/vendors/${vendorId}/styles`)
    await this.waitForReady()
  }

  /**
   * Navigate to style detail
   */
  async gotoStyleDetail(eventId: string, vendorId: string, styleId: string) {
    await this.goto(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}`)
    await this.waitForReady()
  }

  /**
   * Navigate to style capture
   */
  async gotoStyleCapture(eventId: string, vendorId: string) {
    await this.goto(`/events/${eventId}/vendors/${vendorId}/styles/capture`)
    await this.waitForReady()
  }

  /**
   * Navigate to style edit
   */
  async gotoStyleEdit(eventId: string, vendorId: string, styleId: string) {
    await this.goto(`/events/${eventId}/vendors/${vendorId}/styles/${styleId}/edit`)
    await this.waitForReady()
  }

  /**
   * Click add style button
   */
  async clickAddStyle() {
    await this.clickAndWait(this.addStyleButton)
  }

  /**
   * Fill style form and submit
   */
  async fillStyleForm(data: {
    name: string
    category?: string
    season?: string
    composition?: string
    width?: string
    weight?: string
    price?: string
    notes?: string
  }) {
    await this.nameInput.fill(data.name)
    if (data.category && await this.categoryInput.isVisible()) {
      await this.categoryInput.fill(data.category)
    }
    if (data.season && await this.seasonInput.isVisible()) {
      await this.seasonInput.fill(data.season)
    }
    if (data.composition && await this.compositionInput.isVisible()) {
      await this.compositionInput.fill(data.composition)
    }
    if (data.width && await this.widthInput.isVisible()) {
      await this.widthInput.fill(data.width)
    }
    if (data.weight && await this.weightInput.isVisible()) {
      await this.weightInput.fill(data.weight)
    }
    if (data.price && await this.priceInput.isVisible()) {
      await this.priceInput.fill(data.price)
    }
    if (data.notes && await this.notesInput.isVisible()) {
      await this.notesInput.fill(data.notes)
    }
  }

  /**
   * Upload style image
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
   * Click on a style card by name
   */
  async clickStyleByName(name: string) {
    const styleLink = this.styleCard.filter({ hasText: name }).first()
    await this.clickAndWait(styleLink)
  }

  /**
   * Assert style with name is visible in list
   */
  async assertStyleVisible(name: string) {
    await expect(this.styleCard.filter({ hasText: name })).toBeVisible()
  }

  /**
   * Assert style with name is not visible in list
   */
  async assertStyleNotVisible(name: string) {
    await expect(this.styleCard.filter({ hasText: name })).not.toBeVisible()
  }

  /**
   * Search for a style
   */
  async search(query: string) {
    if (await this.searchInput.isVisible()) {
      await this.searchInput.fill(query)
      await this.waitForReady()
    }
  }

  /**
   * Filter styles
   */
  async openFilters() {
    if (await this.filterButton.isVisible()) {
      await this.filterButton.click()
    }
  }

  /**
   * Swipe left on style card to reveal edit
   */
  async swipeLeftToEdit(styleName: string) {
    const card = this.styleCard.filter({ hasText: styleName })
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
   * Swipe right on style card to reveal delete
   */
  async swipeRightToDelete(styleName: string) {
    const card = this.styleCard.filter({ hasText: styleName })
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
   * Delete style with confirmation
   */
  async deleteStyleWithName(name: string) {
    const styleCard = this.styleCard.filter({ hasText: name })
    await styleCard.hover()
    const deleteBtn = styleCard.locator(this.deleteStyleButton)
    await deleteBtn.click()
    const confirmButton = this.page.getByRole('button', { name: /confirm|delete|yes/i })
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click()
    }
    await this.waitForReady()
  }

  /**
   * Click add variant button
   */
  async clickAddVariant() {
    await this.clickAndWait(this.addVariantButton)
  }

  /**
   * Fill variant form and submit
   */
  async fillVariantForm(data: {
    color?: string
    size?: string
    sku?: string
    stock?: string
    price?: string
  }) {
    if (data.color && await this.variantColorInput.isVisible()) {
      await this.variantColorInput.fill(data.color)
    }
    if (data.size && await this.variantSizeInput.isVisible()) {
      await this.variantSizeInput.fill(data.size)
    }
    if (data.sku && await this.variantSKUInput.isVisible()) {
      await this.variantSKUInput.fill(data.sku)
    }
    if (data.stock && await this.variantStockInput.isVisible()) {
      await this.variantStockInput.fill(data.stock)
    }
    if (data.price && await this.variantPriceInput.isVisible()) {
      await this.variantPriceInput.fill(data.price)
    }
  }

  /**
   * Perform pull-to-refresh on styles list
   */
  async pullToRefresh() {
    const boundingBox = await this.stylesList.boundingBox()
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
   * Get style count
   */
  async getStyleCount(): Promise<number> {
    return await this.styleCard.count()
  }

  /**
   * Get variant count
   */
  async getVariantCount(): Promise<number> {
    return await this.variantCard.count()
  }
}
