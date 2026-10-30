#!/usr/bin/env deno

/**
 * validate-edge-function-docs.ts
 *
 * Ensures every directory in supabase/functions/ (excluding _shared, _tests)
 * is documented in EDGE_FUNCTION_CONTRACTS.md.
 *
 * Usage: deno run --allow-read scripts/validate-edge-function-docs.ts
 */

const FUNCTIONS_DIR = new URL('../supabase/functions/', import.meta.url)
const CONTRACTS_FILE = new URL('../docs/03_operations/cloud/EDGE_FUNCTION_CONTRACTS.md', import.meta.url)
const EDGE_FUNCTIONS_FILE = new URL('../docs/00_system/backend/EDGE_FUNCTIONS.md', import.meta.url)
const HARDENING_FILE = new URL('../docs/03_operations/cloud/EDGE_FUNCTION_HARDENING.md', import.meta.url)
const SPEC_FILE = new URL('../SPEC.md', import.meta.url)
const RUNBOOK_FILE = new URL('../docs/03_operations/cloud/DEPLOYMENT_RUNBOOK.md', import.meta.url)

interface DocFile {
  path: URL
  label: string
}

const DOC_FILES: DocFile[] = [
  { path: CONTRACTS_FILE, label: 'EDGE_FUNCTION_CONTRACTS.md' },
  { path: EDGE_FUNCTIONS_FILE, label: 'EDGE_FUNCTIONS.md' },
  { path: HARDENING_FILE, label: 'EDGE_FUNCTION_HARDENING.md' },
  { path: SPEC_FILE, label: 'SPEC.md' },
  { path: RUNBOOK_FILE, label: 'DEPLOYMENT_RUNBOOK.md' },
]

const IGNORE_DIRS = new Set(['_shared', '_tests'])

async function getFunctionDirs(): Promise<string[]> {
  const names: string[] = []
  for await (const entry of Deno.readDir(FUNCTIONS_DIR)) {
    if (entry.isDirectory && !IGNORE_DIRS.has(entry.name)) {
      names.push(entry.name)
    }
  }
  return names.sort()
}

async function getDocumentedFunctions(filePath: URL, knownFunctions: Set<string>): Promise<string[]> {
  const content = await Deno.readTextFile(filePath)
  const found: string[] = []
  const seen = new Set<string>()
  // Only count matches that are known edge function directory names
  for (const fn of knownFunctions) {
    if (content.includes(`\`${fn}\``)) {
      seen.add(fn)
      found.push(fn)
    }
  }
  return found.sort()
}

async function main(): Promise<void> {
  const actual = await getFunctionDirs()
  const knownFunctions = new Set(actual)
  let exitCode = 0

  for (const doc of DOC_FILES) {
    const documented = await getDocumentedFunctions(doc.path, knownFunctions)
    const missing = actual.filter(f => !documented.includes(f))

    if (missing.length > 0) {
      console.error(`❌ ${doc.label} is missing documentation for:`)
      for (const fn of missing) {
        console.error(`   - ${fn}`)
      }
      exitCode = 1
    } else {
      console.log(`✅ ${doc.label} — all ${actual.length} functions documented`)
    }
  }

  // Check for stale docs (documented but no longer exists)
  for (const doc of DOC_FILES) {
    if (doc.label === 'SPEC.md') continue
    const documented = await getDocumentedFunctions(doc.path, knownFunctions)
    const stale = documented.filter(f => !actual.includes(f))
    if (stale.length > 0) {
      console.warn(`⚠️  ${doc.label} references removed functions:`)
      for (const fn of stale) {
        console.warn(`   - ${fn}`)
      }
    }
  }

  if (exitCode === 0) {
    console.log(`\n✅ All ${actual.length} edge functions are fully documented.`)
  }
  Deno.exit(exitCode)
}

await main()
