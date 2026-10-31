/**
 * catalogue-mock-helper.ts
 * ------------------------
 * Intercepts Supabase Edge Function calls for the schema-driven catalogue
 * flow (extract-catalogue-item / commit-reviewed-catalogue-item) and returns
 * deterministic fixture responses. No live model APIs are ever called.
 *
 * Usage:
 *   import { mockCatalogueItemExtraction, mockCatalogueItemCommit, clearCatalogueMocks } from '../helpers/catalogue-mock-helper'
 *
 *   test.beforeEach(async ({ page }) => {
 *     await mockCatalogueItemExtraction(page)
 *     await mockCatalogueItemCommit(page)
 *   })
 *
 *   test.afterEach(async ({ page }) => {
 *     await clearCatalogueMocks(page)
 *   })
 */

import { Page, Route } from '@playwright/test'

const EDGE_FUNCTION_BASE =
  process.env.VITE_SUPABASE_URL
  ?? (process.env.SUPABASE_PROJECT_REF ? `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co` : '')

const EXTRACT_URL = `${EDGE_FUNCTION_BASE}/functions/v1/extract-catalogue-item*`
const COMMIT_URL = `${EDGE_FUNCTION_BASE}/functions/v1/commit-reviewed-catalogue-item*`

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Mirrors the extract-catalogue-item response contract:
// { item, metadata } with the garment schema output root.
export const MOCK_CATALOGUE_ITEM_PAYLOAD = {
  item: {
    item_code: 'GAR-E2E-001',
    name: 'E2E Summer Dress',
    garment_type: 'Dress',
    silhouette: 'A-line',
    construction: null,
    fabric_composition: '100% Cotton',
    closure: 'Zip',
    neckline: null,
    sleeve: 'Sleeveless',
    fit: 'Regular',
    sizing: 'S-L',
    season: 'SS25',
    metadata: null,
    colourways: [{ colour_name: 'Red', sizing: 'S-L' }],
  },
  metadata: {
    extractor_name: 'mock-garment-extractor',
    extractor_model: 'mock-model',
    extractor_version: '1.0.0',
    extraction_timestamp: new Date(0).toISOString(),
  },
}

export const MOCK_CATALOGUE_COMMIT_PAYLOAD = {
  item_id: '00000000-0000-4000-8000-000000000001',
  variant_ids: [],
  scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
  idempotent: false,
}

/**
 * Intercepts catalogue item extraction calls.
 */
export async function mockCatalogueItemExtraction(
  page: Page,
  payload = MOCK_CATALOGUE_ITEM_PAYLOAD,
  delayMs = 800,
): Promise<void> {
  await page.route(EXTRACT_URL, async (route: Route) => {
    await delay(delayMs)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

/**
 * Intercepts catalogue item commit calls.
 */
export async function mockCatalogueItemCommit(
  page: Page,
  payload = MOCK_CATALOGUE_COMMIT_PAYLOAD,
  delayMs = 500,
): Promise<void> {
  await page.route(COMMIT_URL, async (route: Route) => {
    await delay(delayMs)
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

/**
 * Removes catalogue mocks.
 */
export async function clearCatalogueMocks(page: Page): Promise<void> {
  await page.unroute(EXTRACT_URL)
  await page.unroute(COMMIT_URL)
}
