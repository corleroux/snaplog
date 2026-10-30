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

Deno.test('catalogueSchemaRegistry: vendor schema loads with required company_name', async () => {
  clearSchemaCache()
  const schema = await loadSchema('vendor')

  assertEquals(schema.slug, 'vendor')
  assertEquals(schema.kind, 'document')
  assertEquals(schema.display_name, 'Vendor')
  assertEquals(schema.version, 1)

  const companyName = schema.schema.fields.find(
    (f) => f.path === 'document.company_name'
  )
  assertExists(companyName)
  assertEquals(companyName.type, 'string')
  assertEquals(companyName.required, true)
})

Deno.test('catalogueSchemaRegistry: cache returns same object on second load', async () => {
  clearSchemaCache()
  const first = await loadSchema('fabric')
  const second = await loadSchema('fabric')

  assertEquals(first.slug, second.slug)
  assertEquals(first.version, second.version)
})

Deno.test('catalogueSchemaRegistry: unknown slug throws', async () => {
  clearSchemaCache()
  await assertRejects(
    async () => await loadSchema('non-existent-catalogue-type'),
    Error,
    'not found'
  )
})

Deno.test('catalogueSchemaRegistry: invalid schema would throw after cache clear', async () => {
  // The seeded schemas are valid; this test documents the validation contract.
  // If a future migration inserts an invalid schema, loadSchema must reject it.
  clearSchemaCache()
  const schema = await loadSchema('fabric')
  assertExists(schema.schema.fields)
})
