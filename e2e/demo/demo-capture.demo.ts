/**
 * DEMO-01 demo-video footage spec — NOT a CI test.
 *
 * Records real capture → extract → review → commit flows (fabric + garment)
 * on a Pixel 5 viewport with `video: 'on'` (see playwright.demo.config.ts).
 * The recordings in test-results/demo/ are the demo video's app footage,
 * assembled by HyperFrames per docs/demo-video/BRIEF.md.
 *
 * Safety (DEMO-01 / AGENTS.md):
 * - LOCAL STACK ONLY. Seeding and all app writes target the local Supabase
 *   stack. This spec hard-fails against a remote `*.supabase.co` URL unless
 *   DEMO_ALLOW_REMOTE=1 is set with explicit owner go (marked demo records
 *   + cleanup). Never point the failover credentials at the shared project.
 * - Auth: primary = createTestUser() seeding E2E_USER_EMAIL on the local
 *   stack; failover = the same env credentials logging in an existing user.
 *   Credentials come from env only — never printed, logged, or committed.
 * - Extraction is LIVE (Standard mode, muse-spark-1.3) via the local edge
 *   functions. No mocks: the footage must show the real product. Run only
 *   when the local stack + functions are up (see BRIEF.md runbook).
 * - Deterministic seed: fixed event/vendor names, find-or-create, so every
 *   take starts from the same catalogue. Reset the local DB between takes.
 *
 * Image staging (env overrides; defaults are repo fixtures):
 * - DEMO_FABRIC_IMAGE — a fabric composition label (Chinese text for the
 *   translation beat). Default: e2e/fixtures/assets/sample-fabric-swatch.jpg
 * - DEMO_GARMENT_IMAGE — a garment photo. Default: docs/assets/jacket-front.png
 */

import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { login, createTestUser } from '../helpers/auth-helpers'

const SUPABASE_URL =
  process.env.DEMO_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.DEMO_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const DEMO_EMAIL = process.env.E2E_USER_EMAIL || 'demo@snaplog.local'
// Local-stack-only fallback password; the remote guard below runs before
// any use, and real credentials always arrive via env (failover path).
const DEMO_PASSWORD = process.env.E2E_USER_PASSWORD || 'demo-password-local'

const EVENT_NAME = 'Demo — Snaplog Showcase'
const VENDOR_NAME = 'Demo Vendor — Hall 3'
const PACE_MS = Number(process.env.DEMO_PACE_MS || 1400)

const FABRIC_IMAGE =
  process.env.DEMO_FABRIC_IMAGE ||
  resolve(process.cwd(), 'e2e/fixtures/assets/sample-fabric-swatch.jpg')
const GARMENT_IMAGE =
  process.env.DEMO_GARMENT_IMAGE ||
  resolve(process.cwd(), 'docs/assets/jacket-front.png')

function assertLocalStackOnly() {
  if (/\.supabase\.co/.test(SUPABASE_URL) && process.env.DEMO_ALLOW_REMOTE !== '1') {
    throw new Error(
      '[demo] Refusing to run against a remote Supabase project. ' +
        'Point DEMO_SUPABASE_URL at the local stack (http://127.0.0.1:54321), ' +
        'or set DEMO_ALLOW_REMOTE=1 with explicit owner go.'
    )
  }
}

/** Hold on a beat so the recorded footage is legible. */
async function beat(page: Page) {
  await page.waitForTimeout(PACE_MS)
}

let eventId = ''
let vendorId = ''

/**
 * Deterministic seed: sign in as the demo user and find-or-create the
 * fixed demo event + vendor. Runs off-camera, before any footage.
 */
async function seedDemoData() {
  assertLocalStackOnly()
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      '[demo] Missing anon key. Set DEMO_SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY) ' +
        'to the LOCAL stack key from `supabase start`.'
    )
  }

  // Primary auth path: seed the demo user on the local stack.
  if (SUPABASE_SERVICE_KEY) {
    await createTestUser(SUPABASE_URL, SUPABASE_SERVICE_KEY, DEMO_EMAIL, DEMO_PASSWORD)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  })
  if (authError || !auth.user) {
    throw new Error(
      `[demo] Could not sign in as the demo user on the local stack: ${authError?.message ?? 'no user'}. ` +
        'Set SUPABASE_SERVICE_ROLE_KEY (local) so createTestUser can seed it, ' +
        'or provide existing local credentials via E2E_USER_EMAIL/E2E_USER_PASSWORD.'
    )
  }
  const ownerId = auth.user.id

  const { data: events } = await supabase
    .from('events')
    .select('id')
    .eq('name', EVENT_NAME)
    .limit(1)
  if (events && events.length > 0) {
    eventId = events[0].id
  } else {
    const { data, error } = await supabase
      .from('events')
      .insert({
        name: EVENT_NAME,
        description: 'Snaplog hackathon demo (local stack only)',
        location: 'Trade fair — demo hall',
        owner_id: ownerId,
      })
      .select('id')
      .single()
    if (error) throw new Error(`[demo] Failed to seed demo event: ${error.message}`)
    eventId = data.id
  }

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id')
    .eq('event_id', eventId)
    .eq('company_name', VENDOR_NAME)
    .limit(1)
  if (vendors && vendors.length > 0) {
    vendorId = vendors[0].id
  } else {
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        event_id: eventId,
        company_name: VENDOR_NAME,
        booth_number: 'H3-01',
        owner_id: ownerId,
      })
      .select('id')
      .single()
    if (error) throw new Error(`[demo] Failed to seed demo vendor: ${error.message}`)
    vendorId = data.id
  }
}

async function uploadCapture(page: Page, imagePath: string) {
  if (!existsSync(imagePath)) {
    throw new Error(
      `[demo] Capture image not found: ${imagePath}. ` +
        'Stage the image or set DEMO_FABRIC_IMAGE / DEMO_GARMENT_IMAGE.'
    )
  }
  await page.locator('input[type="file"]').first().setInputFiles(imagePath)
  await beat(page)
}

test.describe.configure({ mode: 'serial' })

test.describe('DEMO-01 footage', () => {
  test.beforeAll(async () => {
    await seedDemoData()
  })

  test('fabric label → extract → review → commit', async ({ page }) => {
    test.setTimeout(300_000)
    await login(page, DEMO_EMAIL, DEMO_PASSWORD)
    await beat(page)

    await page.goto(`/events/${eventId}/vendors/${vendorId}/styles/new/capture`)
    await beat(page)

    await uploadCapture(page, FABRIC_IMAGE)

    // Extraction runs live (Standard mode). Wait for the review screen.
    await expect(
      page.getByText(/review|extracted|composition|fabric/i).first()
    ).toBeVisible({ timeout: 120_000 })
    await beat(page)

    // Hold on the review screen — flagged fields are part of the story.
    await page.waitForTimeout(3_000)

    await page.getByRole('button', { name: /save|commit|submit/i }).first().click()
    await expect(page).toHaveURL(/\/styles/, { timeout: 30_000 })
    await beat(page)
  })

  test('garment capture → extract → review → commit', async ({ page }) => {
    test.setTimeout(300_000)
    await login(page, DEMO_EMAIL, DEMO_PASSWORD)
    await beat(page)

    await page.goto(`/events/${eventId}/vendors/${vendorId}/items/new/capture`)
    await beat(page)

    // The schema switch is a demo beat: garment is configuration, not code.
    await page.getByRole('button', { name: /garment/i }).first().click()
    await beat(page)

    await uploadCapture(page, GARMENT_IMAGE)

    await page.getByRole('button', { name: /extract.*info/i }).first().click()
    await expect(page.getByLabel(/garment.*type/i).first()).toBeVisible({
      timeout: 120_000,
    })
    await beat(page)

    await page.waitForTimeout(3_000)

    await page.getByRole('button', { name: /save garment|save|commit/i }).first().click()
    await expect(page.getByText(/saved to the catalogue/i)).toBeVisible({
      timeout: 30_000,
    })
    await beat(page)
  })
})
