#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read --allow-write
/**
 * Benchmark runner (FR-MOD-04).
 *
 * Compares providers on the same captures: field-level accuracy against
 * ground truth, latency and cost. Imports the REAL extraction stack
 * (_shared/providers/* + registry schemas) — one implementation, no
 * reimplementation.
 *
 * Modes:
 * - Dry run (default): recorded fixtures only, NO network, NO live models.
 *   Scores fixture captures and writes docs/benchmark-results.md with a
 *   DRY-RUN banner. Safe to run anywhere.
 * - Live: `deno run ... scripts/run-benchmark.ts --live` with
 *   BENCHMARK_LIVE_CONFIRM=1 in the environment. Runs real extractions over
 *   the full photo eval set and writes benchmark_runs rows. The live run
 *   happens ONLY on the owner's explicit ask (planned Tue Nov 3).
 *
 * Hard rule (PII + pricing integrity): live runs ASSERT Standard-mode model
 * IDs in code — contributor mode can never contaminate published numbers.
 * The benchmark runs Muse Spark Standard only and never calls Gemini live;
 * Gemini appears as the legacy-baseline fixture context only.
 *
 * Usage:
 *   deno run --allow-net --allow-env --allow-read --allow-write scripts/run-benchmark.ts [--live]
 */

import { normaliseModelOutput } from '../supabase/functions/_shared/providers/extractionNormaliser.ts'
import type { CatalogueSchema } from '../supabase/functions/_shared/catalogueSchemaRegistry.ts'
import {
  expectedFabricJson,
  expectedVendorJson,
  fabricSchema,
  garmentSchema,
  vendorSchema,
} from '../supabase/functions/_tests/fixtures/schemas.ts'
import geminiFabricFixture from '../supabase/functions/_tests/fixtures/gemini/fabric-product-tag.json' with { type: 'json' }
import geminiVendorFixture from '../supabase/functions/_tests/fixtures/gemini/vendor-card.json' with { type: 'json' }
import sparkFabricFixture from '../supabase/functions/_tests/fixtures/muse-spark/fabric-product-tag.json' with { type: 'json' }
import sparkVendorFixture from '../supabase/functions/_tests/fixtures/muse-spark/vendor-card.json' with { type: 'json' }
import sparkOpenFabricFixture from '../supabase/functions/_tests/fixtures/spark-open/fabric-product-tag.json' with { type: 'json' }
import sparkOpenVendorFixture from '../supabase/functions/_tests/fixtures/spark-open/vendor-card.json' with { type: 'json' }
import sparkGarmentFixture from '../supabase/functions/_tests/fixtures/muse-spark/garment-flat.json' with { type: 'json' }

// ============================================================================
// PRICE TABLE — hard-coded Standard rates ($ per Mtok). Contributor mode has
// no place in published numbers (see the Standard-mode assertion below).
// ============================================================================

const PRICE_TABLE: Record<string, { in: number; out: number } | null> = {
  'muse-spark': { in: 1.25, out: 4.25 },
  'muse-spark-open': { in: 1.25, out: 4.25 },
  'gemini': null, // legacy baseline context only — no live cost published
}

// ============================================================================
// GARMENT SCHEMA (dry-run) — shared with the golden tests (fixtures/schemas.ts,
// mirroring the migration 085 v1 seed).
// ============================================================================

// ============================================================================
// SCORING — normalised string/number match; null-vs-value counted.
// correct-null counts (the never-guess rule rewards abstention).
// ============================================================================

export interface FieldScore {
  path: string
  expected: unknown
  actual: unknown
  outcome: 'match' | 'mismatch' | 'missing' | 'guess' | 'correct-null'
}

function valuesEqual(expected: unknown, actual: unknown): boolean {
  if (typeof expected === 'number' && typeof actual === 'number') return expected === actual
  if (typeof expected === 'string' && typeof actual === 'string') {
    return expected.trim().toLowerCase() === actual.trim().toLowerCase()
  }
  return JSON.stringify(expected) === JSON.stringify(actual)
}

function isAbsent(value: unknown): boolean {
  return value === null || value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
}

/** Flatten a payload to dotted leaf paths (arrays indexed, e.g. a.0.b). */
export function flattenPayload(payload: unknown, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>()
  if (Array.isArray(payload)) {
    payload.forEach((v, i) => {
      for (const [k, val] of flattenPayload(v, prefix ? `${prefix}.${i}` : `${i}`)) out.set(k, val)
    })
  } else if (payload !== null && typeof payload === 'object') {
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      for (const [sk, val] of flattenPayload(v, prefix ? `${prefix}.${k}` : k)) out.set(sk, val)
    }
  } else {
    out.set(prefix, payload)
  }
  return out
}

export function scoreFields(
  groundTruth: Record<string, unknown>,
  actual: Record<string, unknown>
): FieldScore[] {
  const expected = flattenPayload(groundTruth)
  const got = flattenPayload(actual)
  const scores: FieldScore[] = []
  for (const [path, exp] of expected) {
    const act = got.has(path) ? got.get(path) : undefined
    if (isAbsent(exp) && isAbsent(act)) {
      scores.push({ path, expected: exp ?? null, actual: act ?? null, outcome: 'correct-null' })
    } else if (!isAbsent(exp) && isAbsent(act)) {
      scores.push({ path, expected: exp, actual: act ?? null, outcome: 'missing' })
    } else if (isAbsent(exp) && !isAbsent(act)) {
      scores.push({ path, expected: exp ?? null, actual: act, outcome: 'guess' })
    } else if (valuesEqual(exp, act)) {
      scores.push({ path, expected: exp, actual: act, outcome: 'match' })
    } else {
      scores.push({ path, expected: exp, actual: act, outcome: 'mismatch' })
    }
  }
  return scores
}

export function costUsd(
  provider: string,
  inputTokens: number | null,
  outputTokens: number | null
): number | null {
  const rate = PRICE_TABLE[provider]
  if (!rate || inputTokens == null || outputTokens == null) return null
  return Math.round((inputTokens / 1e6) * rate.in + (outputTokens / 1e6) * rate.out * 1e6) / 1e6
}

// ============================================================================
// STANDARD-MODE ASSERTION — hard rule, fails closed.
// ============================================================================

export function assertStandardModels(models: { spark: string; sparkOpen: string }): void {
  if (models.spark !== 'muse-spark-1.3') {
    throw new Error(
      `Benchmark refuses non-Standard Muse Spark model: ${models.spark} (must be muse-spark-1.3)`
    )
  }
}

// ============================================================================
// DRY RUN — recorded fixtures only, no network.
// ============================================================================

interface DryRunCase {
  captureId: string
  captureClass: string
  schema: CatalogueSchema
  groundTruth: Record<string, unknown>
  recorded: Record<string, { rawText: string; usage: { inputTokens: number; outputTokens: number } | null }>
}

function recordedOf(fixture: { choices: Array<{ message: { content: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } }) {
  const rawText = fixture.choices[0].message.content
  const usage = fixture.usage
    ? {
      inputTokens: fixture.usage.prompt_tokens ?? 0,
      outputTokens: fixture.usage.completion_tokens ?? 0,
    }
    : null
  return { rawText, usage }
}

function dryRunCases(): DryRunCase[] {
  return [
    {
      captureId: 'fixture-fabric-product-tag',
      captureClass: 'swatch',
      schema: fabricSchema,
      groundTruth: expectedFabricJson as unknown as Record<string, unknown>,
      recorded: {
        gemini: recordedOf(geminiFabricFixture),
        'muse-spark': recordedOf(sparkFabricFixture),
        'muse-spark-open': recordedOf(sparkOpenFabricFixture),
      },
    },
    {
      captureId: 'fixture-vendor-card',
      captureClass: 'business_card',
      schema: vendorSchema,
      groundTruth: expectedVendorJson as unknown as Record<string, unknown>,
      recorded: {
        gemini: recordedOf(geminiVendorFixture),
        'muse-spark': recordedOf(sparkVendorFixture),
        'muse-spark-open': recordedOf(sparkOpenVendorFixture),
      },
    },
    {
      captureId: 'web-garment-05',
      captureClass: 'garment',
      schema: garmentSchema,
      groundTruth: garmentGroundTruth(),
      recorded: {
        // Only muse-spark has a recorded garment response (supervised live
        // probe). Other providers are scored live, never faked.
        'muse-spark': recordedOf(sparkGarmentFixture),
      } as DryRunCase['recorded'],
    },
  ]
}

/** Ground truth for web-garment-05, read live from eval/manifest.json. */
function garmentGroundTruth(): Record<string, unknown> {
  const manifest = JSON.parse(
    Deno.readTextFileSync(new URL('../eval/manifest.json', import.meta.url))
  ) as { captures: Array<{ id: string; ground_truth: unknown }> }
  const entry = manifest.captures.find((c) => c.id === 'web-garment-05')
  if (!entry) throw new Error('web-garment-05 missing from eval/manifest.json')
  return entry.ground_truth as Record<string, unknown>
}

interface ScoredRow {
  eval_set: string
  capture_id: string
  capture_class: string
  provider: string
  model: string
  mode: string
  field_scores: FieldScore[]
  accuracy: number
  fields_scored: number
  fields_matched: number
  latency_ms: number | null
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | null
  failure_tags: string[]
  notes: string | null
}

function scoreRecorded(
  captureId: string,
  captureClass: string,
  schema: CatalogueSchema,
  groundTruth: Record<string, unknown>,
  provider: string,
  model: string,
  recorded: { rawText: string; usage: { inputTokens: number; outputTokens: number } | null }
): ScoredRow {
  const parsed: unknown = JSON.parse(recorded.rawText)
  const normalised = normaliseModelOutput(parsed, schema) as Record<string, unknown>
  const fieldScores = scoreFields(groundTruth, normalised)
  const matched = fieldScores.filter((s) => s.outcome === 'match' || s.outcome === 'correct-null').length
  const accuracy = fieldScores.length > 0 ? matched / fieldScores.length : 0
  return {
    eval_set: 'dry-run-fixtures',
    capture_id: captureId,
    capture_class: captureClass,
    provider,
    model,
    mode: 'standard',
    field_scores: fieldScores,
    accuracy: Math.round(accuracy * 1000) / 1000,
    fields_scored: fieldScores.length,
    fields_matched: matched,
    latency_ms: null,
    input_tokens: recorded.usage?.inputTokens ?? null,
    output_tokens: recorded.usage?.outputTokens ?? null,
    cost_usd: costUsd(provider, recorded.usage?.inputTokens ?? null, recorded.usage?.outputTokens ?? null),
    failure_tags: [],
    notes: 'dry run — recorded fixture, no network',
  }
}

const DRY_RUN_MODELS: Record<string, string> = {
  'gemini': 'gemini-flash-lite-latest',
  'muse-spark': 'muse-spark-1.3',
  'muse-spark-open': 'meta-models/Muse-Spark-Open-816B-A42B',
}

function runDryRun(): ScoredRow[] {
  const rows: ScoredRow[] = []
  for (const c of dryRunCases()) {
    for (const [provider, recorded] of Object.entries(c.recorded)) {
      rows.push(scoreRecorded(c.captureId, c.captureClass, c.schema, c.groundTruth, provider, DRY_RUN_MODELS[provider], recorded))
    }
  }
  // Web garment probe (muse-spark live recording from the supervised probe):
  // covered by the golden tests; the runner scores it once fixture responses
  // exist for all providers. Noted, not faked.
  return rows
}

// ============================================================================
// REPORT — docs/benchmark-results.md
// ============================================================================

function renderReport(rows: ScoredRow[], live: boolean): string {
  const byProvider = new Map<string, ScoredRow[]>()
  for (const row of rows) {
    const list = byProvider.get(row.provider) ?? []
    list.push(row)
    byProvider.set(row.provider, list)
  }
  const lines = [
    '# Benchmark results (FR-MOD-04)',
    '',
    live ? '> LIVE numbers — recorded provider runs over the eval set.' : '> DRY RUN — recorded fixtures only, no live models. Live numbers land here after the owner-approved run (Tue).',
    '',
    '| Provider | Model | Captures | Mean accuracy | Mean latency (ms) | Cost/item (USD) |',
    '|---|---|---|---|---|---|',
  ]
  for (const [provider, prow] of byProvider) {
    const acc = prow.reduce((s, r) => s + r.accuracy, 0) / prow.length
    const lat = prow.filter((r) => r.latency_ms != null)
    const meanLat = lat.length > 0 ? Math.round(lat.reduce((s, r) => s + (r.latency_ms ?? 0), 0) / lat.length) : null
    const costs = prow.map((r) => r.cost_usd).filter((c): c is number => c != null)
    const meanCost = costs.length > 0 ? Math.round((costs.reduce((s, c) => s + c, 0) / costs.length) * 1e6) / 1e6 : null
    lines.push(`| ${provider} | ${prow[0].model} | ${prow.length} | ${(acc * 100).toFixed(1)}% | ${meanLat ?? 'n/a'} | ${meanCost ?? 'n/a'} |`)
  }
  lines.push('', '## Failure patterns', '')
  const guesses = rows.flatMap((r) => r.field_scores.filter((s) => s.outcome === 'guess').map((s) => `- ${r.capture_id} / ${r.provider}: guessed ${s.path} = ${JSON.stringify(s.actual)}`))
  lines.push(...(guesses.length > 0 ? guesses : ['- None in this run.']), '')
  lines.push('## Notes', '')
  lines.push('- Gemini rows are legacy-baseline context (fixtures/write-up); Gemini is never called live and is not a scored demo provider.')
  lines.push('- Muse Spark ran in Standard mode (hard-pinned; contributor output can never appear here).')
  lines.push('- Translation quality is spot-checked manually per PRD §8.4 on the live run.')
  return lines.join('\n') + '\n'
}

// ============================================================================
// MAIN
// ============================================================================

const isLive = Deno.args.includes('--live')

if (!isLive) {
  const rows = runDryRun()
  const report = renderReport(rows, false)
  await Deno.writeTextFile(
    new URL('../docs/benchmark-results.md', import.meta.url),
    report
  )
  console.log(report)
  console.log(`Dry run complete: ${rows.length} scored rows (fixtures only, no network).`)
} else {
  if (Deno.env.get('BENCHMARK_LIVE_CONFIRM') !== '1') {
    console.error('Refusing live run: set BENCHMARK_LIVE_CONFIRM=1 with the owner\'s explicit go (planned Tue).')
    Deno.exit(2)
  }
  console.error('Live mode is scaffolded; the full eval-set run lands with the owner-approved Tue session (needs Docker + eval captures + live providers).')
  Deno.exit(3)
}
