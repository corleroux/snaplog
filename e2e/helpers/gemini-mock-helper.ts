/**
 * gemini-mock-helper.ts
 * ---------------------
 * Intercepts Supabase Edge Function calls to the Gemini AI extraction
 * endpoint and returns deterministic fixture responses.
 *
 * Usage:
 *   import { mockGeminiVendorExtraction, mockGeminiFabricExtraction, clearGeminiMock } from '../helpers/gemini-mock-helper'
 *
 *   test.beforeEach(async ({ page }) => {
 *     await mockGeminiVendorExtraction(page)
 *   })
 *
 *   test.afterEach(async ({ page }) => {
 *     await clearGeminiMock(page)
 *   })
 *
 * For the integration suite (real API calls), simply don't call these helpers.
 * Gate with: if (process.env.TEST_SUITE === 'integration') return
 */

import { Page, Route } from '@playwright/test'

// ---------------------------------------------------------------------------
// Edge Function URL patterns
// Update these if your Edge Function routes change.
// ---------------------------------------------------------------------------

const EDGE_FUNCTION_BASE =
  process.env.VITE_SUPABASE_URL
  ?? (process.env.SUPABASE_PROJECT_REF ? `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co` : '')

const VENDOR_EXTRACTION_URL = `${EDGE_FUNCTION_BASE}/functions/v1/extract-vendor-document*`
const FABRIC_EXTRACTION_URL = `${EDGE_FUNCTION_BASE}/functions/v1/extract-fabric-document*`

// ---------------------------------------------------------------------------
// Fixture payloads
// These mirror the shape your Edge Function returns after Gemini processing.
// Adjust field names to match your actual API response contract.
// ---------------------------------------------------------------------------

export const MOCK_VENDOR_PAYLOAD = {
  success: true,
  data: {
    company: 'Acme Textiles Co.',
    booth: 'B-42',
    contact_name: 'Jane Smith',
    email: 'jane@acmetextiles.example.com',
    phone: '+27 11 555 0100',
    website: 'https://acmetextiles.example.com',
    confidence: 0.94,
  },
  raw_payload: {
    model: 'gemini-pro-vision',
    extraction_time_ms: 1200,
  },
}

export const MOCK_FABRIC_PAYLOAD = {
  success: true,
  data: {
    name: 'Summer Linen Blend',
    category: 'Woven',
    season: 'SS26',
    composition: '55% Linen, 45% Cotton',
    variants: [
      { color: 'Natural White', size: null, sku: 'SLB-NW-001', stock: true, price: null },
      { color: 'Dusty Rose',    size: null, sku: 'SLB-DR-001', stock: true, price: null },
      { color: 'Slate Blue',    size: null, sku: 'SLB-SB-001', stock: false, price: null },
    ],
    confidence: 0.91,
  },
  raw_payload: {
    model: 'gemini-pro-vision',
    extraction_time_ms: 1350,
  },
}

// Simulates a Gemini service failure — use in error-handling tests
export const MOCK_EXTRACTION_ERROR_PAYLOAD = {
  success: false,
  error: 'AI extraction failed: upstream service unavailable',
  data: null,
}

// Simulates a low-confidence result — use to test the review/correction flow
export const MOCK_LOW_CONFIDENCE_VENDOR_PAYLOAD = {
  ...MOCK_VENDOR_PAYLOAD,
  data: {
    ...MOCK_VENDOR_PAYLOAD.data,
    company: '',           // Empty field forces user to manually fill in
    confidence: 0.42,
  },
}

// ---------------------------------------------------------------------------
// Core mock functions
// ---------------------------------------------------------------------------

/**
 * Intercepts vendor extraction Edge Function calls.
 * Returns MOCK_VENDOR_PAYLOAD with a realistic 800ms simulated delay.
 */
export async function mockGeminiVendorExtraction(
  page: Page,
  payload = MOCK_VENDOR_PAYLOAD,
  delayMs = 800,
): Promise<void> {
  await page.route(VENDOR_EXTRACTION_URL, async (route: Route) => {
    await _delay(delayMs)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

/**
 * Intercepts fabric extraction Edge Function calls.
 * Returns MOCK_FABRIC_PAYLOAD with a realistic 800ms simulated delay.
 */
export async function mockGeminiFabricExtraction(
  page: Page,
  payload = MOCK_FABRIC_PAYLOAD,
  delayMs = 800,
): Promise<void> {
  await page.route(FABRIC_EXTRACTION_URL, async (route: Route) => {
    await _delay(delayMs)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

/**
 * Mocks both vendor and fabric extraction in one call.
 * Convenient for tests that exercise the full capture flow end-to-end.
 */
export async function mockAllGeminiExtractions(page: Page): Promise<void> {
  await mockGeminiVendorExtraction(page)
  await mockGeminiFabricExtraction(page)
}

/**
 * Simulates an extraction failure from the Edge Function.
 * Use in error-handling.spec.ts to test graceful degradation.
 */
export async function mockGeminiExtractionFailure(
  page: Page,
  target: 'vendor' | 'fabric' | 'both' = 'both',
): Promise<void> {
  const url =
    target === 'vendor'
      ? VENDOR_EXTRACTION_URL
      : target === 'fabric'
      ? FABRIC_EXTRACTION_URL
      : [VENDOR_EXTRACTION_URL, FABRIC_EXTRACTION_URL]

  const applyMock = async (routeUrl: string) => {
    await page.route(routeUrl, async (route: Route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EXTRACTION_ERROR_PAYLOAD),
      })
    })
  }

  if (Array.isArray(url)) {
    await Promise.all(url.map(applyMock))
  } else {
    await applyMock(url)
  }
}

/**
 * Simulates network timeout on extraction (no response).
 * Use to test the 45s timeout handling and user-facing timeout message.
 */
export async function mockGeminiExtractionTimeout(
  page: Page,
  target: 'vendor' | 'fabric' | 'both' = 'both',
): Promise<void> {
  const applyMock = async (routeUrl: string) => {
    await page.route(routeUrl, async (route: Route) => {
      // Abort the request — triggers network error in the app
      await route.abort('timedout')
    })
  }

  if (target === 'both') {
    await Promise.all([applyMock(VENDOR_EXTRACTION_URL), applyMock(FABRIC_EXTRACTION_URL)])
  } else {
    await applyMock(target === 'vendor' ? VENDOR_EXTRACTION_URL : FABRIC_EXTRACTION_URL)
  }
}

/**
 * Removes all Gemini route intercepts.
 * Call in afterEach to avoid intercepts leaking between tests.
 */
export async function clearGeminiMock(page: Page): Promise<void> {
  await page.unroute(VENDOR_EXTRACTION_URL)
  await page.unroute(FABRIC_EXTRACTION_URL)
}

// ---------------------------------------------------------------------------
// Internal utility
// ---------------------------------------------------------------------------

function _delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}