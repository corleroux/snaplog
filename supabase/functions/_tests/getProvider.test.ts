/**
 * Provider factory tests (FR-MOD-01).
 *
 * getProvider resolves the active extraction provider from the
 * EXTRACTION_PROVIDER edge secret (default: gemini) and fails loudly on
 * unknown values — no silent fallback (that is FR-MOD-03).
 *
 * Also covers buildExtractionRunInfo, which maps a provider result onto the
 * scan_sessions run columns added by migration 084.
 *
 * Offline: no network, no Supabase. Run with: pnpm test:edge (or
 * deno test --allow-net --allow-env --no-check this file).
 */

import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import { getProvider } from '../_shared/providers/getProvider.ts'
import { buildExtractionRunInfo } from '../_shared/scanSession.ts'
import type { ExtractionResult } from '../_shared/providers/types.ts'

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) Deno.env.delete(key)
    else Deno.env.set(key, value)
  }
}

Deno.test('getProvider: defaults to gemini when EXTRACTION_PROVIDER is unset', () => {
  const saved = Deno.env.get('EXTRACTION_PROVIDER')
  Deno.env.delete('EXTRACTION_PROVIDER')
  try {
    assertEquals(getProvider().name, 'gemini')
  } finally {
    restoreEnv({ EXTRACTION_PROVIDER: saved })
  }
})

Deno.test('getProvider: selects gemini when configured explicitly', () => {
  const saved = Deno.env.get('EXTRACTION_PROVIDER')
  Deno.env.set('EXTRACTION_PROVIDER', 'gemini')
  try {
    assertEquals(getProvider().name, 'gemini')
  } finally {
    restoreEnv({ EXTRACTION_PROVIDER: saved })
  }
})

Deno.test('getProvider: is case- and whitespace-insensitive', () => {
  const saved = Deno.env.get('EXTRACTION_PROVIDER')
  Deno.env.set('EXTRACTION_PROVIDER', '  Gemini ')
  try {
    assertEquals(getProvider().name, 'gemini')
  } finally {
    restoreEnv({ EXTRACTION_PROVIDER: saved })
  }
})

Deno.test('getProvider: unknown provider fails loudly with the available list', () => {
  const saved = Deno.env.get('EXTRACTION_PROVIDER')
  Deno.env.set('EXTRACTION_PROVIDER', 'muse-spark')
  try {
    assertThrows(() => getProvider(), Error, 'Unknown EXTRACTION_PROVIDER "muse-spark"')
  } finally {
    restoreEnv({ EXTRACTION_PROVIDER: saved })
  }
})

Deno.test('getProvider: empty value falls back to gemini', () => {
  const saved = Deno.env.get('EXTRACTION_PROVIDER')
  Deno.env.set('EXTRACTION_PROVIDER', '')
  try {
    assertEquals(getProvider().name, 'gemini')
  } finally {
    restoreEnv({ EXTRACTION_PROVIDER: saved })
  }
})

// ============================================================================
// buildExtractionRunInfo — scan_sessions run columns (migration 084)
// ============================================================================

function providerResult(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    json: { style: {} },
    raw: '{"style":{}}',
    provider: 'gemini',
    model: 'gemini-flash-lite-latest',
    usage: { inputTokens: 1487, outputTokens: 296 },
    latencyMs: 1234,
    confidences: null,
    ...overrides,
  }
}

Deno.test('buildExtractionRunInfo: maps provider result and schema to run columns', () => {
  assertEquals(
    buildExtractionRunInfo(providerResult(), { slug: 'fabric', version: 1 }),
    {
      schema_type: 'fabric',
      schema_version: 1,
      provider: 'gemini',
      model: 'gemini-flash-lite-latest',
      latency_ms: 1234,
      usage: { input_tokens: 1487, output_tokens: 296 },
      cost_usd: null,
    }
  )
})

Deno.test('buildExtractionRunInfo: usage null and partial token counts map to nulls', () => {
  assertEquals(
    buildExtractionRunInfo(providerResult({ usage: null }), { slug: 'vendor', version: 1 }).usage,
    null
  )
  assertEquals(
    buildExtractionRunInfo(providerResult({ usage: { inputTokens: 10 } }), { slug: 'vendor', version: 1 }).usage,
    { input_tokens: 10, output_tokens: null }
  )
})

Deno.test('buildExtractionRunInfo: costUsd flows through when a provider reports it', () => {
  assertEquals(
    buildExtractionRunInfo(
      providerResult({ usage: { inputTokens: 10, costUsd: 0.0004 } }),
      { slug: 'fabric', version: 2 }
    ).cost_usd,
    0.0004
  )
})
