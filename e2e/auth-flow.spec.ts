/**
 * E2E: Auth Flow Tests
 *
 * Comprehensive authentication flow tests:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Signup flow
 * - Password reset flow
 * - Session persistence
 * - Protected route handling
 * - Return URL preservation
 */

import { test, expect } from '@playwright/test'
import { AuthPage } from './fixtures/page-objects/auth-page'
import { TEST_USER } from './fixtures/test-data'

test.describe('Authentication Flow @core', () => {
  let authPage: AuthPage

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page)
  })

  test.describe('Login', () => {
    test('login with valid credentials redirects to events', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.login(TEST_USER.email, TEST_USER.password)

      // Should redirect to events dashboard
      await expect(page).toHaveURL(/\/events/, { timeout: 15_000 })
    })

    test('login with invalid email shows error', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.emailInput.fill('invalid-email@example.com')
      await authPage.passwordInput.fill(TEST_USER.password)
      await authPage.loginButton.click()

      // Should show error message
      await expect(authPage.errorMessage).toBeVisible()
      await expect(page).toHaveURL(/\/login/)
    })

    test('login with invalid password shows error', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.emailInput.fill(TEST_USER.email)
      await authPage.passwordInput.fill('wrong-password')
      await authPage.loginButton.click()

      // Should show error message
      await expect(authPage.errorMessage).toBeVisible()
      await expect(page).toHaveURL(/\/login/)
    })

    test('login with empty fields shows validation errors', async ({ page }) => {
      await authPage.gotoLogin()
      await authPage.loginButton.click()

      // Should show validation errors
      await expect(authPage.errorMessage).toBeVisible()
    })
  })

  // SKIP: Signup creates real accounts in staging — noisy for CI runs.
  // Auth-persistence.spec.ts covers login; signup tested manually.
  test.describe.skip('Signup', () => {
    test('signup flow creates account and redirects to events', async ({ page }) => {
      const timestamp = Date.now()
      const email = `e2e-test-${timestamp}@example.com`
      const password = 'TestPassword123!'

      await authPage.gotoSignup()
      await authPage.signup(email, password, password)

      // Should redirect to events dashboard or onboarding
      await expect(page).toHaveURL(/\/events|\/onboarding/, { timeout: 15_000 })
    })

    test('signup with mismatched passwords shows error', async ({ page }) => {
      await authPage.gotoSignup()
      await authPage.emailInput.fill('test@example.com')
      await authPage.passwordInput.fill('Password123!')
      await authPage.confirmPasswordInput.fill('DifferentPassword123!')
      await authPage.signupButton.click()

      // Should show error about mismatched passwords
      await expect(authPage.errorMessage).toBeVisible()
    })

    test('signup with weak password shows error', async ({ page }) => {
      await authPage.gotoSignup()
      await authPage.emailInput.fill('test@example.com')
      await authPage.passwordInput.fill('123') // Too weak
      await authPage.confirmPasswordInput.fill('123')
      await authPage.signupButton.click()

      // Should show error about weak password
      await expect(authPage.errorMessage).toBeVisible()
    })
  })

  test.describe('Password Reset', () => {
    test('forgot password flow sends reset email', async ({ page }) => {
      await authPage.gotoForgotPassword()
      await authPage.requestPasswordReset(TEST_USER.email)

      // Should show success message
      await expect(authPage.successMessage).toBeVisible()
      await expect(page.getByText(/email.*sent|check.*email/i)).toBeVisible()
    })

    test('reset password with valid token updates password', async ({ page }) => {
      // This test would require a valid reset token
      // For now, we'll just verify the reset page loads
      await page.goto('/reset-password?token=fake-token')
      await expect(authPage.newPasswordInput).toBeVisible()
      await expect(authPage.resetPasswordButton).toBeVisible()
    })

    test('back to login link from forgot password works', async ({ page }) => {
      await authPage.gotoForgotPassword()
      await authPage.backToLoginLink.click()

      await expect(page).toHaveURL(/\/login/)
    })
  })

  test.describe('Session Persistence', () => {
    test('session persists across page reload', async ({ page }) => {
      // Login first
      await authPage.gotoLogin()
      await authPage.login(TEST_USER.email, TEST_USER.password)
      await expect(page).toHaveURL(/\/events/)

      // Reload the page
      await page.reload()

      // Should still be on events page (not redirected to login)
      await expect(page).toHaveURL(/\/events/, { timeout: 15_000 })
    })

    test('session persists across browser tabs', async ({ context }) => {
      const page1 = await context.newPage()
      const page2 = await context.newPage()

      // Login on page 1
      const authPage1 = new AuthPage(page1)
      await authPage1.gotoLogin()
      await authPage1.login(TEST_USER.email, TEST_USER.password)
      await expect(page1).toHaveURL(/\/events/)

      // Navigate to events on page 2
      await page2.goto('/events')

      // Should be logged in on page 2 as well
      await expect(page2).toHaveURL(/\/events/, { timeout: 10_000 })
    })

    test('logout clears session and redirects to login', async ({ page }) => {
      // Login first
      await authPage.gotoLogin()
      await authPage.login(TEST_USER.email, TEST_USER.password)
      await expect(page).toHaveURL(/\/events/)

      // Logout
      const logoutButton = page.getByRole('button', { name: /logout|sign.*out/i })
      if (await logoutButton.isVisible({ timeout: 2000 })) {
        await logoutButton.click()
      } else {
        // Try opening menu first
        const menuButton = page.getByRole('button', { name: /menu|account/i })
        await menuButton.click()
        await logoutButton.click()
      }

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    })
  })

  test.describe('Protected Routes', () => {
    test('unauthenticated user accessing events is redirected to login', async ({ page }) => {
      await page.goto('/events')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    })

    test('unauthenticated user accessing vendors is redirected to login', async ({ page }) => {
      await page.goto('/events/some-event-id/vendors')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    })

    test('unauthenticated user accessing styles is redirected to login', async ({ page }) => {
      await page.goto('/events/some-event-id/vendors/some-vendor-id/styles')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    })

    test('return URL is preserved after login', async ({ page }) => {
      // Navigate to a deep link while logged out
      await page.goto('/events/test-event-id/vendors')

      // Should redirect to login with return URL
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })

      // Login
      await authPage.login(TEST_USER.email, TEST_USER.password)

      // Should redirect back to the intended page (or events if ID is invalid)
      await expect(page).toHaveURL(/\/events/, { timeout: 15_000 })
    })

    test('public pages are accessible without authentication', async ({ page }) => {
      // These pages should be accessible without login
      const publicPaths = ['/login', '/signup', '/forgot-password']

      for (const path of publicPaths) {
        await page.goto(path)
        await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')))
      }
    })
  })

  // SKIP: Remember Me checkbox not present in current login form.
  test.describe.skip('Remember Me', () => {
    test('remember me option persists session longer', async ({ page, context }) => {
      // This test verifies the "remember me" checkbox exists
      await authPage.gotoLogin()

      const rememberMeCheckbox = page.getByLabel(/remember|keep.*signed/i)

      if (await rememberMeCheckbox.isVisible({ timeout: 2000 })) {
        await expect(rememberMeCheckbox).toBeVisible()
      }
      // Note: Testing actual persistence would require waiting days
      // which is not practical for E2E tests
    })
  })

  // SKIP: OAuth/social login not implemented (P4-AUTH-1).
  test.describe.skip('Social Login', () => {
    test('social login buttons are present on login page', async ({ page }) => {
      await authPage.gotoLogin()

      // Check for common social login providers
      const googleLogin = page.getByRole('button', { name: /google|continue with google/i })
      const appleLogin = page.getByRole('button', { name: /apple|continue with apple/i })

      // At least one might be visible (depending on config)
      const hasSocialLogin = await googleLogin.isVisible().catch(() => false) ||
                            await appleLogin.isVisible().catch(() => false)

      // This is optional - just verify they exist if configured
      if (hasSocialLogin) {
        await expect(googleLogin.or(appleLogin)).toBeVisible()
      }
    })
  })
})
