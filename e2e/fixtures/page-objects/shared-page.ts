/**
 * Shared Features Page Object Model
 *
 * Selectors and methods for shared features across pages:
 * - Global Search
 * - Notifications
 * - Sharing
 * - Export
 */

import { type Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class SharedPage extends BasePage {
  // Search selectors
  readonly searchButton: Locator
  readonly searchInput: Locator
  readonly searchResults: Locator
  readonly searchResultItem: Locator
  readonly clearSearchButton: Locator
  readonly noResultsMessage: Locator

  // Notification selectors
  readonly notificationBell: Locator
  readonly notificationBadge: Locator
  readonly notificationDropdown: Locator
  readonly notificationItem: Locator
  readonly markAllReadButton: Locator
  readonly deleteNotificationButton: Locator

  // Share dialog selectors
  readonly shareDialog: Locator
  readonly shareLinkInput: Locator
  readonly copyLinkButton: Locator
  readonly shareLinkCopiedMessage: Locator
  readonly setExpirationButton: Locator
  readonly expirationDateInput: Locator
  readonly generateQRCodeButton: Locator
  readonly qrCode: Locator
  readonly closeShareDialogButton: Locator

  // Export selectors
  readonly exportDialog: Locator
  readonly exportFormatSelect: Locator
  readonly csvFormatOption: Locator
  readonly xlsxFormatOption: Locator
  readonly pdfFormatOption: Locator
  readonly exportButton: Locator
  readonly closeExportDialogButton: Locator

  constructor(page: Page) {
    super(page)

    // Search
    this.searchButton = page.getByRole('button', { name: /search|find/i }).or(page.getByTestId('search-button'))
    this.searchInput = page.getByRole('searchbox', { name: /search/i }).or(page.getByPlaceholder(/search/i)).or(page.getByLabel(/search/i))
    this.searchResults = page.getByTestId('search-results').or(page.locator('[data-testid*="search-result"]'))
    this.searchResultItem = page.getByTestId(/search-result-item/).or(page.locator('.search-result-item, [class*="searchResult"]'))
    this.clearSearchButton = page.getByRole('button', { name: /clear|reset|×/i })
    this.noResultsMessage = page.getByText(/no.*results|nothing.*found|try.*different/i)

    // Notifications
    this.notificationBell = page.getByRole('button', { name: /notification|bell|alert/i }).or(page.getByTestId('notification-bell'))
    this.notificationBadge = page.locator('[class*="badge"], [data-unread]').filter({ hasText: /\d+/ })
    this.notificationDropdown = page.getByRole('listbox').or(page.getByTestId('notification-dropdown'))
    this.notificationItem = page.getByTestId(/notification-item/).or(page.locator('.notification-item, [class*="notificationItem"]'))
    this.markAllReadButton = page.getByRole('button', { name: /mark.*all.*read/i })
    this.deleteNotificationButton = page.getByRole('button', { name: /delete|remove/i })

    // Share dialog
    this.shareDialog = page.getByRole('dialog').filter({ hasText: /share/i }).or(page.getByTestId('share-dialog'))
    this.shareLinkInput = page.getByRole('textbox', { name: /link|url/i }).or(page.locator('input[value*="http"]'))
    this.copyLinkButton = page.getByRole('button', { name: /copy/i })
    this.shareLinkCopiedMessage = page.getByText(/copied|link.*copied/i)
    this.setExpirationButton = page.getByRole('button', { name: /expiration|expire|set.*date/i })
    this.expirationDateInput = page.getByLabel(/expiration|expire|date/i)
    this.generateQRCodeButton = page.getByRole('button', { name: /qr.*code|qrcode/i })
    this.qrCode = page.locator('img[src*="qr"], canvas, svg').filter({ hasText: '' })
    this.closeShareDialogButton = page.getByRole('button', { name: /close|cancel/i }).filter({ has: this.shareDialog })

    // Export dialog
    this.exportDialog = page.getByRole('dialog').filter({ hasText: /export/i }).or(page.getByTestId('export-dialog'))
    this.exportFormatSelect = page.getByRole('combobox', { name: /format|file.*type/i })
    this.csvFormatOption = page.getByRole('option', { name: /csv/i })
    this.xlsxFormatOption = page.getByRole('option', { name: /excel|xlsx/i })
    this.pdfFormatOption = page.getByRole('option', { name: /pdf/i })
    this.exportButton = page.getByRole('button', { name: /export|download/i })
    this.closeExportDialogButton = page.getByRole('button', { name: /close|cancel/i }).filter({ has: this.exportDialog })
  }

  // ========== Search Methods ==========

  /**
   * Click search button to open search
   */
  async openSearch() {
    if (await this.searchButton.isVisible()) {
      await this.searchButton.click()
    }
    await expect(this.searchInput).toBeVisible()
  }

  /**
   * Type in search input
   */
  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(500) // Wait for debounced search
  }

  /**
   * Clear search
   */
  async clearSearch() {
    if (await this.clearSearchButton.isVisible()) {
      await this.clearSearchButton.click()
    } else {
      await this.searchInput.clear()
    }
  }

  /**
   * Click a search result
   */
  async clickSearchResult(index = 0) {
    const results = this.searchResultItem
    await results.nth(index).click()
    await this.waitForReady()
  }

  /**
   * Assert search results are visible
   */
  async assertSearchResultsVisible() {
    await expect(this.searchResults).toBeVisible()
  }

  /**
   * Assert no results message is shown
   */
  async assertNoResults() {
    await expect(this.noResultsMessage).toBeVisible()
  }

  /**
   * Get search result count
   */
  async getSearchResultCount(): Promise<number> {
    return await this.searchResultItem.count()
  }

  // ========== Notification Methods ==========

  /**
   * Click notification bell
   */
  async openNotifications() {
    await this.notificationBell.click()
    await expect(this.notificationDropdown).toBeVisible()
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const badgeText = await this.notificationBadge.textContent()
    if (badgeText) {
      return parseInt(badgeText, 10)
    }
    return 0
  }

  /**
   * Assert notification bell has badge
   */
  async assertHasUnreadNotifications() {
    await expect(this.notificationBadge).toBeVisible()
  }

  /**
   * Click a notification
   */
  async clickNotification(index = 0) {
    const items = this.notificationItem
    await items.nth(index).click()
    await this.waitForReady()
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead() {
    if (await this.markAllReadButton.isVisible()) {
      await this.markAllReadButton.click()
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(index = 0) {
    const items = this.notificationItem
    const deleteBtn = items.nth(index).locator(this.deleteNotificationButton)
    await deleteBtn.click()
  }

  /**
   * Close notification dropdown
   */
  async closeNotifications() {
    await this.page.keyboard.press('Escape')
    await expect(this.notificationDropdown).not.toBeVisible()
  }

  // ========== Share Methods ==========

  /**
   * Assert share dialog is open
   */
  async assertShareDialogOpen() {
    await expect(this.shareDialog).toBeVisible()
  }

  /**
   * Assert share dialog is closed
   */
  async assertShareDialogClosed() {
    await expect(this.shareDialog).not.toBeVisible()
  }

  /**
   * Copy share link to clipboard
   */
  async copyShareLink() {
    await this.copyLinkButton.click()
    await expect(this.shareLinkCopiedMessage).toBeVisible({ timeout: 5000 })
  }

  /**
   * Get share link text
   */
  async getShareLink(): Promise<string> {
    const input = this.shareLinkInput
    return await input.inputValue()
  }

  /**
   * Set share link expiration
   */
  async setExpiration(date: string) {
    if (await this.setExpirationButton.isVisible()) {
      await this.setExpirationButton.click()
      await this.expirationDateInput.fill(date)
    }
  }

  /**
   * Generate QR code
   */
  async generateQRCode() {
    if (await this.generateQRCodeButton.isVisible()) {
      await this.generateQRCodeButton.click()
      await expect(this.qrCode).toBeVisible({ timeout: 10000 })
    }
  }

  /**
   * Close share dialog
   */
  async closeShareDialog() {
    await this.closeShareDialogButton.click()
    await expect(this.shareDialog).not.toBeVisible()
  }

  // ========== Export Methods ==========

  /**
   * Assert export dialog is open
   */
  async assertExportDialogOpen() {
    await expect(this.exportDialog).toBeVisible()
  }

  /**
   * Select export format
   */
  async selectExportFormat(format: 'csv' | 'xlsx' | 'pdf') {
    if (await this.exportFormatSelect.isVisible()) {
      await this.exportFormatSelect.click()
      switch (format) {
        case 'csv':
          await this.csvFormatOption.click()
          break
        case 'xlsx':
          await this.xlsxFormatOption.click()
          break
        case 'pdf':
          await this.pdfFormatOption.click()
          break
      }
    }
  }

  /**
   * Click export/download button
   */
  async clickExport() {
    const downloadPromise = this.page.waitForEvent('download', { timeout: 30000 })
    await this.exportButton.click()
    const download = await downloadPromise
    return download
  }

  /**
   * Close export dialog
   */
  async closeExportDialog() {
    await this.closeExportDialogButton.click()
    await expect(this.exportDialog).not.toBeVisible()
  }
}
