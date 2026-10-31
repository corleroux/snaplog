/**
 * Validate eval/manifest.json (FR-MOD-04 eval set).
 *
 * Checks: manifest parses; every entry has a valid class/source/schema;
 * the capture file exists under eval/; garment ground truth mirrors the
 * schema payload shape (item object); rack_video entries carry an expected
 * distinct-item count; class counts meet the plan targets.
 *
 * Run: deno run --allow-read scripts/validate-eval-manifest.ts
 */

const MANIFEST_PATH = new URL('../eval/manifest.json', import.meta.url)

const VALID_CLASSES = [
  'composition_tag',
  'swatch',
  'garment',
  'business_card',
  'stall_front',
  'rack_video',
] as const

const VALID_SOURCES = ['existing', 'fresh', 'web'] as const

const TARGETS: Record<string, number> = {
  composition_tag: 15,
  swatch: 8,
  garment: 12,
  business_card: 10,
  stall_front: 5,
  rack_video: 2,
}

interface ManifestEntry {
  id: string
  file: string
  class: string
  source: string
  schema?: string
  ground_truth?: unknown
  languages?: unknown
  failure_tags?: unknown
}

const errors: string[] = []
const warnings: string[] = []

let manifest: { captures: ManifestEntry[] }
try {
  manifest = JSON.parse(await Deno.readTextFile(MANIFEST_PATH))
} catch (err) {
  console.error(`FAIL: cannot read manifest: ${err instanceof Error ? err.message : err}`)
  Deno.exit(1)
}

if (!Array.isArray(manifest.captures)) {
  console.error('FAIL: manifest.captures is not an array')
  Deno.exit(1)
}

const counts: Record<string, number> = {}
const seenIds = new Set<string>()

for (const [index, entry] of manifest.captures.entries()) {
  const where = `captures[${index}] (${entry.id ?? 'missing id'})`

  if (!entry.id || typeof entry.id !== 'string') {
    errors.push(`${where}: missing string id`)
    continue
  }
  if (seenIds.has(entry.id)) errors.push(`${where}: duplicate id`)
  seenIds.add(entry.id)

  if (!VALID_CLASSES.includes(entry.class as (typeof VALID_CLASSES)[number])) {
    errors.push(`${where}: invalid class "${entry.class}"`)
  } else {
    counts[entry.class] = (counts[entry.class] ?? 0) + 1
  }

  if (!VALID_SOURCES.includes(entry.source as (typeof VALID_SOURCES)[number])) {
    errors.push(`${where}: invalid source "${entry.source}"`)
  }

  if (!entry.file || typeof entry.file !== 'string') {
    errors.push(`${where}: missing file`)
  } else {
    try {
      await Deno.stat(new URL(entry.file, new URL('../eval/', import.meta.url)))
    } catch {
      // Captures stay gitignored/local-only, so a clean checkout legitimately
      // lacks web-sourced files until they are synced. Fresh/production
      // captures must exist; web captures warn.
      const message = `${where}: file not found: ${entry.file}`
      if (entry.source === 'web') {
        warnings.push(message)
      } else {
        errors.push(message)
      }
    }
  }

  if (entry.class === 'garment') {
    const gt = entry.ground_truth as { item?: unknown } | undefined
    if (!gt || typeof gt.item !== 'object' || gt.item === null) {
      errors.push(`${where}: garment ground truth must mirror the schema payload shape ({ item: {...} })`)
    }
    if (entry.schema !== 'garment') {
      errors.push(`${where}: garment entry must declare schema "garment"`)
    }
  }

  if (entry.class === 'rack_video') {
    const gt = entry.ground_truth as { expected_distinct_items?: unknown } | undefined
    if (!gt || typeof gt.expected_distinct_items !== 'number') {
      errors.push(`${where}: rack_video ground truth must carry expected_distinct_items`)
    }
  }

  if (!Array.isArray(entry.failure_tags)) {
    warnings.push(`${where}: failure_tags is not an array`)
  }
  if (!Array.isArray(entry.languages)) {
    warnings.push(`${where}: languages is not an array`)
  }
}

for (const [cls, target] of Object.entries(TARGETS)) {
  const have = counts[cls] ?? 0
  if (have < target) {
    warnings.push(`class "${cls}": ${have}/${target} (target not yet met)`)
  }
}

// Captures must stay local — fail if any are tracked by git.
try {
  const cmd = new Deno.Command('git', {
    args: ['ls-files', 'eval/captures'],
    cwd: new URL('..', import.meta.url).pathname,
  })
  const { code, stdout } = await cmd.output()
  if (code === 0 && new TextDecoder().decode(stdout).trim() !== '') {
    errors.push('eval/captures/ contains git-tracked files — captures must stay local')
  }
} catch {
  warnings.push('could not verify git-ignore status of eval/captures/')
}

for (const warning of warnings) console.log(`WARN: ${warning}`)

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL: ${error}`)
  Deno.exit(1)
}

console.log(
  `OK: ${manifest.captures.length} entries valid ` +
  `(${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(', ')})`
)
