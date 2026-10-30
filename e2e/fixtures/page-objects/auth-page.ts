/**
 * Auth Page Object Model
 *
 * Selectors and methods for authentication-related pages:
 * - Login
 * - Signup
 * - Forgot Password
 * - Reset Password
 */

import { type Page, Locator, expect } from '@playwright/test'
import { BasePage } from './base-page'

export class AuthPage extends BasePage {
  // Login page selectors
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly signupLink: Locator
  readonly forgotPasswordLink: Locator

  // Signup page selectors
  readonly confirmPasswordInput: Locator
  readonly signupButton: Locator

  // Forgot password selectors
  readonly sendResetLinkButton: Locator
  readonly backToLoginLink: Locator

  // Reset password selectors
  readonly newPasswordInput: Locator
  readonly resetPasswordButton: Locator

  constructor(page: Page) {
    super(page)

    // Login selectors
    this.emailInput = page.getByLabel('Email')
    this.passwordInput = page.getByLabel('Password')
    this.loginButton = page.getByRole('button', { name: /log in|sign in/i })
    this.signupLink = page.getByRole('link', { name: /sign up|create account|register/i })
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i })

    // Signup selectors
    this.confirmPasswordInput = page.getByLabel(/confirm.*password/i)
    this.signupButton = page.getByRole('button', { name: /sign up|create account|register/i })

    // Forgot password selectors
    this.sendResetLinkButton = page.getByRole('button', { name: /send.*link|reset/i })
    this.backToLoginLink = page.getByRole('link', { name: /back.*login/i })

    // Reset password selectors
    this.newPasswordInput = page.getByLabel(/new.*password/i)
    this.resetPasswordButton = page.getByRole('button', { name: /reset.*password|update/i })
  }

  /**
   * Navigate to login page
   */
  async gotoLogin() {
    await this.goto('/login')
    await this.waitForReady()
  }

  /**
   * Navigate to signup page
   */
  async gotoSignup() {
    await this.goto('/signup')
    await this.waitForReady()
  }

  /**
   * Navigate to forgot password page
   */
  async gotoForgotPassword() {
    await this.goto('/forgot-password')
    await this.waitForReady()
  }

  /**
   * Fill login form and submit
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.clickAndWait(this.loginButton)
  }

  /**
   * Fill signup form and submit
   */
  async signup(email: string, password: string, confirmPassword?: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    if (confirmPassword && await this.confirmPasswordInput.isVisible()) {
      await this.confirmPasswordInput.fill(confirmPassword)
    }
    await this.clickAndWait(this.signupButton)
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    await this.emailInput.fill(email)
    await this.clickAndWait(this.sendResetLinkButton)
  }

  /**
   * Reset password with token
   */
  async resetPassword(newPassword: string, confirmPassword?: string) {
    await this.newPasswordInput.fill(newPassword)
    const confirmInput = this.confirmPasswordInput
    if (confirmPassword && await confirmInput.isVisible()) {
      await confirmInput.fill(confirmPassword)
    }
    await this.clickAndWait(this.resetPasswordButton)
  }

  /**
   * Assert we're on the login page
   */
  async assertOnLoginPage() {
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.loginButton).toBeVisible()
  }

  /**
   * Assert we're on the signup page
   */
  async assertOnSignupPage() {
    await expect(this.emailInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.signupButton).toBeVisible()
  }

  /**
   * Assert login shows an error
   */
  async assertLoginError() {
    await expect(this.errorMessage).toBeVisible()
  }
}
