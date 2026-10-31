/**
 * Catalogue Schema Registry Tests
 *
 * Deno-based tests for supabase/functions/_shared/catalogueSchemaRegistry.ts.
 *
 * Requires local Supabase running with migration 083 applied:
 *   supabase start
 *   supabase db reset
 *
 * Run:
 *   deno test --allow-net --allow-env supabase/functions/_tests/catalogueSchemaRegistry.test.ts
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
} from 'https://deno.land/std@0.208.0/assert/mod.ts'
import {
  clearSchemaCache,
  loadSchema,
} from '../_shared/catalogueSchemaRegistry.ts'

// The local Supabase demo service-role key. package.json test:edge only sets
// SUPABASE_URL and SUPABASE_ANON_KEY; registry tests need service-role access.
if (!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
  Deno.env.set(
    'SUPABASE_SERVICE_ROLE_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
  )
}

Deno.test('catalogueSchemaRegistry: fabric schema loads with all expected fields', async () => {
  clearSchemaCache()
  const schema = await loadSchema('fabric')

  assertEquals(schema.slug, 'fabric')
  assertEquals(schema.kind, 'catalogue_type')
  assertEquals(schema.display_name, 'Fabric')
  assertEquals(schema.version, 1)
  assertExists(schema.schema.fields)
  assertEquals(schema.schema.fields.length > 0, true)
  assertEquals(schema.schema.translate_to_english, true)
  assertExists(schema.schema.rules)
  assertExists(schema.schema.scan_types)
  assertExists(schema.schema.scan_types?.product_tag)

  const itemCode = schema.schema.fields.find((f) => f.path === 'style.item_code')
  assertExists(itemCode)
  assertEquals(itemCode.type, 'string')
  assertEquals(itemCode.label, 'Item code')

  const variants = schema.schema.fields.find((f) => f.path === 'style.variants')
  assertExists(variants)
  assertEquals(variants.type, 'array')
})

Deno.test('catalogueSchemaRegistry: garment schema loads with expected fields', async () => {
  clearSchemaCache()
  const schema = await loadSchema('garment')

  assertEquals(schema.slug, 'garment')
  assertEquals(schema.kind, 'catalogue_type')
  assertEquals(schema.display_name, 'Garment')
  assertEquals(schema.version, 1)
  assertExists(schema.schema.rules)
  assertExists(schema.schema.scan_types)

  const garmentType = schema.schema.fields.find((f) => f.path === 'item.garment_type')
  assertExists(garmentType)
  assertEquals(garmentType.type, 'string')

  const colourways = schema.schema.fields.find((f) => f.path === 'item.colourways')
  assertExists(colourways)
  assertEquals(colourways.type, 'array')
})

Deno.test('catalogueSchemaRegistry: vendor schema loads with required company_name', async () => {
  clearSchemaCache()
  const schema = await loadSchema('vendor')

  assertEquals(schema.slug, 'vendor')
  assertEquals(schema.kind, 'document')
  assertEquals(schema.display_name, 'Vendor')
  assertEquals(schema.version, 1)
  assertExists(schema.schema.rules)

  const companyName = schema.schema.fields.find(
    (f) => f.path === 'document.company_name'
  )
  assertExists(companyName)
  assertEquals(companyName.type, 'string')
  assertEquals(companyName.required, true)

  const website = schema.schema.fields.find(
    (f) => f.path === 'document.website_url'
  )
  assertExists(website)
  assertEquals(website.hint?.includes('https://'), true)
})

Deno.test('catalogueSchemaRegistry: cache returns the same object on second load', async () => {
  clearSchemaCache()
  const first = await loadSchema('fabric')
  const second = await loadSchema('fabric')

  // Reference identity proves the cache was hit.
  assertEquals(first === second, true)
})

Deno.test('catalogueSchemaRegistry: unknown slug throws', async () => {
  clearSchemaCache()
  await assertRejects(
    async () => await loadSchema('non-existent-catalogue-type'),
    Error,
    'not found'
  )
})

Deno.test('catalogueSchemaRegistry: loaded fabric schema has well-formed fields', async () => {
  clearSchemaCache()

  // The registry validates schema shape on load. An invalid schema would be
  // rejected; here we verify the seeded fabric schema loads and every field
  // has the required shape properties.
  const schema = await loadSchema('fabric')
  assertExists(schema.schema.fields)
  assertEquals(schema.schema.fields.every((f) => f.path && f.type && f.label), true)
})
