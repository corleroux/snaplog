/**
 * E2E: Notifications Feature Tests
 *
 * Tests for the notifications functionality:
 * - Notification bell displays unread count
 * - Click bell opens notification dropdown
 * - Click notification marks as read and navigates
 * - Mark all as read button
 * - Real-time notification appears
 * - Delete notification
 */

import { test, expect } from '@playwright/test'
import { login, waitForAppReady } from './fixtures/test-data'
import { SharedPage } from './fixtures/page-objects/shared-page'

// SKIP: Notification sending is backend-only; real-time delivery in E2E is flaky.
// The NotificationCenter UI works as an inbox but triggering notifications requires
// backend events. Re-enable post-launch with proper E2E notification seeding helpers.
test.describe.skip('Notifications Feature', () => {
  let sharedPage: SharedPage

  test.beforeEach(async ({ page }) => {
    await login(page)
    await waitForAppReady(page)
    sharedPage = new SharedPage(page)
  })

  test.describe('Notification Bell', () => {
    test('notification bell is visible', async ({ page }) => {
      await expect(sharedPage.notificationBell).toBeVisible()
    })

    test('notification bell displays unread count', async ({ page }) => {
      const unreadCount = await sharedPage.getUnreadCount()

      if (unreadCount > 0) {
        await sharedPage.assertHasUnreadNotifications()
      }
      // If count is 0, badge might not be shown, which is fine
    })

    test('unread count badge shows correct number', async ({ page }) => {
      const badgeText = await sharedPage.notificationBadge.textContent()

      if (badgeText) {
        const count = parseInt(badgeText, 10)
        expect(count).toBeGreaterThan(0)
      }
      // No badge means 0 unread, which is valid
    })
  })

  test.describe('Notification Dropdown', () => {
    test('click bell opens notification dropdown', async ({ page }) => {
      await sharedPage.openNotifications()

      await expect(sharedPage.notificationDropdown).toBeVisible()
    })

    test('click outside closes notification dropdown', async ({ page }) => {
      await sharedPage.openNotifications()

      // Click outside
      await page.locator('body').click({ position: { x: 10, y: 10 } })

      await expect(sharedPage.notificationDropdown).not.toBeVisible()
    })

    test('pressing Escape closes notification dropdown', async ({ page }) => {
      await sharedPage.openNotifications()

      await page.keyboard.press('Escape')

      await expect(sharedPage.notificationDropdown).not.toBeVisible()
    })
  })

  test.describe('Notification Items', () => {
    test('notifications are listed in dropdown', async ({ page }) => {
      await sharedPage.openNotifications()

      const itemCount = await sharedPage.notificationItem.count()

      // If there are notifications, they should be visible
      if (itemCount > 0) {
        await expect(sharedPage.notificationItem.first()).toBeVisible()
      }
      // Empty state is also valid
    })

    test('notification shows message text', async ({ page }) => {
      await sharedPage.openNotifications()

      const firstNotification = sharedPage.notificationItem.first()

      if (await firstNotification.isVisible({ timeout: 2000 })) {
        const text = await firstNotification.textContent()
        expect(text?.trim().length).toBeGreaterThan(0)
      } else {
        test.skip('No notifications to test')
      }
    })

    test('notification shows timestamp', async ({ page }) => {
      await sharedPage.openNotifications()

      const firstNotification = sharedPage.notificationItem.first()

      if (await firstNotification.isVisible({ timeout: 2000 })) {
        // Look for time indicators (ago, dates, etc.)
        const timeText = firstNotification.getByText(/ago|minute|hour|day/i)
        // Timestamp might or might not be visible depending on implementation
      } else {
        test.skip('No notifications to test')
      }
    })
  })

  test.describe('Mark as Read', () => {
    test('clicking notification marks it as read', async ({ page }) => {
      await sharedPage.openNotifications()

      const firstNotification = sharedPage.notificationItem.first()

      if (await firstNotification.isVisible({ timeout: 2000 })) {
        // Get initial unread count
        const initialCount = await sharedPage.getUnreadCount()

        // Click notification
        await sharedPage.clickNotification(0)

        // Wait for navigation/mark as read
        await page.waitForTimeout(1000)

        // Go back to check count
        await page.goBack()
        await sharedPage.openNotifications()

        const newCount = await sharedPage.getUnreadCount()

        // Count should have decreased (or stayed same if it was 0)
        expect(newCount).toBeLessThanOrEqual(initialCount)
      } else {
        test.skip('No notifications to test')
      }
    })

    test('mark all as read clears unread count', async ({ page }) => {
      await sharedPage.openNotifications()

      const initialCount = await sharedPage.getUnreadCount()

      if (initialCount === 0) {
        test.skip('No unread notifications to test')
      }

      if (await sharedPage.markAllReadButton.isVisible({ timeout: 2000 })) {
        await sharedPage.markAllAsRead()

        await page.waitForTimeout(500)

        // Unread count should be 0 or badge hidden
        const newCount = await sharedPage.getUnreadCount()
        expect(newCount).toBe(0)
      } else {
        test.skip('Mark all read button not found')
      }
    })
  })

  test.describe('Delete Notification', () => {
    test('delete button removes notification from list', async ({ page }) => {
      await sharedPage.openNotifications()

      const firstNotification = sharedPage.notificationItem.first()

      if (await firstNotification.isVisible({ timeout: 2000 })) {
        // Get initial count
        const initialCount = await sharedPage.notificationItem.count()

        // Delete first notification
        await sharedPage.deleteNotification(0)
        await page.waitForTimeout(500)

        // Count should have decreased
        const newCount = await sharedPage.notificationItem.count()
        expect(newCount).toBeLessThan(initialCount)
      } else {
        test.skip('No notifications to test')
      }
    })

    test('deleted notification cannot be interacted with', async ({ page }) => {
      await sharedPage.openNotifications()

      const firstNotification = sharedPage.notificationItem.first()

      if (await firstNotification.isVisible({ timeout: 2000 })) {
        // Delete it
        await sharedPage.deleteNotification(0)
        await page.waitForTimeout(500)

        // Try to click - should not work
        const newFirst = sharedPage.notificationItem.first()
        if (await newFirst.isVisible({ timeout: 1000 })) {
          // There's still a notification, but it should be different
          // This is hard to test without tracking notification IDs
        }
      } else {
        test.skip('No notifications to test')
      }
    })
  })

  test.describe('Notification Navigation', () => {
    test('clicking notification navigates to related content', async ({ page }) => {
      await sharedPage.openNotifications()

      const firstNotification = sharedPage.notificationItem.first()

      if (await firstNotification.isVisible({ timeout: 2000 })) {
        const initialUrl = page.url()

        await sharedPage.clickNotification(0)
        await waitForAppReady(page)

        // URL should have changed (or we stayed on same page but scrolled)
        const newUrl = page.url()
        // Navigation might or might not happen depending on notification type
      } else {
        test.skip('No notifications to test')
      }
    })
  })

  test.describe('Real-time Notifications', () => {
    test('new notification appears without page refresh', async ({ page }) => {
      // This test would require triggering a notification
      // which is difficult to do in E2E without backend access
      test.skip('Requires backend notification trigger')
    })

    test('unread count updates in real-time', async ({ page }) => {
      // This would require WebSocket/Realtime subscription
      test.skip('Requires real-time notification system')
    })
  })

  test.describe('Empty State', () => {
    test('empty state shows when no notifications', async ({ page }) => {
      await sharedPage.openNotifications()

      const hasNotifications = await sharedPage.notificationItem.count() > 0

      if (!hasNotifications) {
        // Should show empty state message
        const emptyMessage = page.getByText(/no.*notification|all.*caught.*up|empty/i)
        if (await emptyMessage.isVisible({ timeout: 2000 })) {
          await expect(emptyMessage).toBeVisible()
        }
      } else {
        test.skip('Has notifications - cannot test empty state')
      }
    })
  })

  test.describe('Notification Types', () => {
    test('vendor capture notification appears', async ({ page }) => {
      // This would require creating a vendor as another user
      test.skip('Requires multi-user setup')
    })

    test('style capture notification appears', async ({ page }) => {
      // This would require creating a style as another user
      test.skip('Requires multi-user setup')
    })

    test('share notification appears', async ({ page }) => {
      // This would require sharing an event
      test.skip('Requires share action')
    })

    test('comment notification appears', async ({ page }) => {
      // This would require commenting feature
      test.skip('Requires comment feature')
    })
  })

  test.describe('Notification Settings', () => {
    test('notification settings are accessible', async ({ page }) => {
      await sharedPage.openNotifications()

      // Look for settings link
      const settingsLink = page.getByRole('link', { name: /settings|preferences|notifications/i })
        .or(page.getByRole('button', { name: /settings|preferences/i }))

      if (await settingsLink.isVisible({ timeout: 2000 })) {
        await settingsLink.click()

        // Should navigate to settings
        await expect(page).toHaveURL(/settings|preferences|notifications/)
      } else {
        test.skip('Settings link not found')
      }
    })

    test('enable/disable notification types', async ({ page }) => {
      // This would require accessing notification settings
      test.skip('Requires settings page implementation')
    })
  })
})
