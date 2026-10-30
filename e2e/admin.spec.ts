/**
 * E2E: Admin Panel Tests
 *
 * Tests for the admin panel:
 * - Admin user can access /admin routes
 * - Non-admin user redirected from /admin
 * - Admin dashboard displays metrics
 * - User list shows all users
 * - Event list shows all events
 * - Audit log displays actions
 * - Health check shows system status
 */

import { test, expect } from '@playwright/test'
import { login, waitForAppReady } from './fixtures/test-data'

// SKIP: Admin panel tests require admin user credentials not available in CI.
// The get-admin-users edge function also needs to be deployed (T7.1-c) before
// the user list tests are meaningful. Re-enable post-launch with admin test user.
test.describe.skip('Admin Panel', () => {
  // These tests require admin access
  // They may need to be skipped if admin user is not configured

  test.describe('Admin Access Control', () => {
    test('admin user can access admin routes', async ({ page }) => {
      // This test requires an admin user
      // For now, we'll just test the route exists
      test.skip('Requires admin user credentials')

      // When admin is available:
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin')
      // await expect(page).toHaveURL(/\/admin/)
    })

    test('non-admin user redirected from admin routes', async ({ page }) => {
      // Login as regular user
      await login(page)
      await waitForAppReady(page)

      // Try to access admin
      await page.goto('/admin')

      // Should redirect to events or show permission error
      const isEventsPage = page.url().includes('/events')
      const hasPermissionError = await page.getByText(/access denied|admin only|not authorized/i).isVisible().catch(() => false)

      expect(isEventsPage || hasPermissionError).toBeTruthy()
    })

    test('admin login shows admin features', async ({ page }) => {
      test.skip('Requires admin user credentials')

      // When admin is available:
      // await login(page, 'admin@example.com', 'admin-password')
      // Look for admin menu items
      // const adminLink = page.getByRole('link', { name: /admin/i })
      // await expect(adminLink).toBeVisible()
    })
  })

  test.describe('Admin Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // These tests require admin access
      test.skip('Requires admin user credentials')
    })

    test('admin dashboard displays metrics', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin')

      // Look for dashboard metrics
      // const metrics = [
      //   page.getByText(/total users/i),
      //   page.getByText(/total events/i),
      //   page.getByText(/active sessions/i),
      //   page.getByText(/storage used/i),
      // ]

      // for (const metric of metrics) {
      //   if (await metric.isVisible({ timeout: 2000 })) {
      //     await expect(metric).toBeVisible()
      //   }
      // }
    })

    test('dashboard shows charts or graphs', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin')

      // Look for charts
      // const chart = page.locator('canvas, svg, [class*="chart"]')
      // if (await chart.isVisible({ timeout: 2000 })) {
      //   await expect(chart).toBeVisible()
      // }
    })

    test('dashboard has date range filter', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin')

      // const dateFilter = page.getByRole('combobox', { name: /date|period|range/i })
      // if (await dateFilter.isVisible({ timeout: 2000 })) {
      //   await expect(dateFilter).toBeVisible()
      // }
    })
  })

  test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
      test.skip('Requires admin user credentials')
    })

    test('user list shows all users', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/users')

      // const userList = page.getByTestId('user-list').or(page.locator('[data-testid*="user"]'))
      // await expect(userList).toBeVisible()

      // const users = page.locator('[class*="user"], [class*="User"]')
      // const userCount = await users.count()
      // expect(userCount).toBeGreaterThan(0)
    })

    test('can search for users', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/users')

      // const searchInput = page.getByPlaceholder(/search|filter/i)
      // if (await searchInput.isVisible()) {
      //   await searchInput.fill('admin')
      //   await page.waitForTimeout(500)

      //   const results = page.locator('[class*="user"], [class*="User"]')
      //   const resultCount = await results.count()
      //   expect(resultCount).toBeGreaterThan(0)
      // }
    })

    test('can view user details', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/users')

      // const firstUser = page.locator('[class*="user"], [class*="User"]').first()
      // await firstUser.click()

      // await expect(page).toHaveURL(/\/admin\/users\/.+/)
    })

    test('can edit user role', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/users')

      // const editButton = page.getByRole('button', { name: /edit|manage/i }).first()
      // await editButton.click()

      // const roleSelect = page.getByRole('combobox', { name: /role/i })
      // if (await roleSelect.isVisible()) {
      //   await roleSelect.selectOption('viewer')
      //   await page.getByRole('button', { name: /save|update/i }).click()

      //   await expect(page.getByText(/saved|updated/i)).toBeVisible()
      // }
    })
  })

  test.describe('Event Management', () => {
    test.beforeEach(async ({ page }) => {
      test.skip('Requires admin user credentials')
    })

    test('event list shows all events across users', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/events')

      // const eventList = page.getByTestId('event-list')
      // await expect(eventList).toBeVisible()

      // const events = page.locator('[class*="event"], [class*="Event"]')
      // const eventCount = await events.count()
      // expect(eventCount).toBeGreaterThan(0)
    })

    test('can view event details as admin', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/events')

      // const firstEvent = page.locator('[class*="event"], [class*="Event"]').first()
      // await firstEvent.click()

      // await expect(page).toHaveURL(/\/admin\/events\/.+/)
    })

    test('can delete any event', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/events')

      // This is dangerous - maybe skip or use test event
      // test.skip('Too dangerous for automated test')
    })
  })

  test.describe('Audit Log', () => {
    test.beforeEach(async ({ page }) => {
      test.skip('Requires admin user credentials')
    })

    test('audit log displays actions', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/audit')

      // const auditLog = page.getByTestId('audit-log').or(page.locator('[data-testid*="audit"]'))
      // if (await auditLog.isVisible({ timeout: 2000 })) {
      //   await expect(auditLog).toBeVisible()

      //   const entries = page.locator('[class*="audit"], [class*="log"]')
      //   const entryCount = await entries.count()
      //   expect(entryCount).toBeGreaterThan(0)
      // }
    })

    test('audit log shows timestamp', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/audit')

      // const timestamp = page.getByText(/\d{4}-\d{2}-\d{2}|ago|yesterday/i)
      // if (await timestamp.isVisible({ timeout: 2000 })) {
      //   await expect(timestamp).toBeVisible()
      // }
    })

    test('audit log shows user who performed action', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/audit')

      // const userField = page.getByText(/user|by|admin/i)
      // if (await userField.isVisible({ timeout: 2000 })) {
      //   await expect(userField).toBeVisible()
      // }
    })

    test('can filter audit log by action type', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/audit')

      // const filterButton = page.getByRole('button', { name: /filter/i })
      // if (await filterButton.isVisible({ timeout: 2000 })) {
      //   await filterButton.click()

      //   const actionFilter = page.getByRole('checkbox', { name: /create|update|delete/i })
      //   if (await actionFilter.isVisible()) {
      //     await actionFilter.first().check()
      //     await page.waitForTimeout(500)

      //     // Results should be filtered
      //     const entries = page.locator('[class*="audit"], [class*="log"]')
      //     const entryCount = await entries.count()
      //     expect(entryCount).toBeGreaterThanOrEqual(0)
      //   }
      // }
    })
  })

  test.describe('System Health', () => {
    test.beforeEach(async ({ page }) => {
      test.skip('Requires admin user credentials')
    })

    test('health check shows system status', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/health')

      // const statusIndicator = page.getByText(/healthy|operational|status/i)
      // if (await statusIndicator.isVisible({ timeout: 2000 })) {
      //   await expect(statusIndicator).toBeVisible()
      // }
    })

    test('health check shows database status', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/health')

      // const dbStatus = page.getByText(/database|db/i)
      // if (await dbStatus.isVisible({ timeout: 2000 })) {
      //   await expect(dbStatus).toBeVisible()
      // }
    })

    test('health check shows storage status', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/health')

      // const storageStatus = page.getByText(/storage|disk|space/i)
      // if (await storageStatus.isVisible({ timeout: 2000 })) {
      //   await expect(storageStatus).toBeVisible()
      // }
    })
  })

  test.describe('System Settings', () => {
    test.beforeEach(async ({ page }) => {
      test.skip('Requires admin user credentials')
    })

    test('settings page is accessible', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/settings')

      // await expect(page).toHaveURL(/\/admin\/settings/)
    })

    test('can update system settings', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin/settings')

      // const settingInput = page.getByRole('textbox').first()
      // await settingInput.fill('test-value')

      // await page.getByRole('button', { name: /save|update/i }).click()

      // await expect(page.getByText(/saved|updated/i)).toBeVisible()
    })
  })

  test.describe('Admin Navigation', () => {
    test.beforeEach(async ({ page }) => {
      test.skip('Requires admin user credentials')
    })

    test('admin sidebar has all main sections', async ({ page }) => {
      // await login(page, 'admin@example.com', 'admin-password')
      // await page.goto('/admin')

      // const sections = [
      //   page.getByRole('link', { name: /dashboard|overview/i }),
      //   page.getByRole('link', { name: /users/i }),
      //   page.getByRole('link', { name: /events/i }),
      //   page.getByRole('link', { name: /audit|log/i }),
      //   page.getByRole('link', { name: /health|status/i }),
      //   page.getByRole('link', { name: /settings/i }),
      // ]

      // for (const section of sections) {
      //   if (await section.isVisible({ timeout: 2000 })) {
      //     await expect(section).toBeVisible()
      //   }
      // }
    })
  })
})
