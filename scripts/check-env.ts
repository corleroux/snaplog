#!/usr/bin/env -S deno run --allow-read --allow-env

/**
 * Environment validation script for Snaplog.
 *
 * Validates that all required frontend environment variables are set correctly.
 * Run this before starting the dev server or building for production.
 *
 * Usage: deno run --allow-read --allow-env scripts/check-env.ts
 */

import { exists } from 'https://deno.land/std@0.208.0/fs/mod.ts'

const REQUIRED_VARS = [
  { name: 'VITE_SUPABASE_URL', description: 'Supabase project URL' },
  { name: 'VITE_SUPABASE_ANON_KEY', description: 'Supabase anonymous key' },
]

const OPTIONAL_VARS = [
  { name: 'VITE_LOG_LEVEL', description: 'Logging level (debug, info, warn, error)', default: 'info' },
]

interface ValidationResult {
  variable: string
  status: 'valid' | 'missing' | 'invalid'
  error?: string
}

function validateUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function validateEnvVar(name: string, value: string | undefined): ValidationResult {
  if (!value) {
    return { variable: name, status: 'missing', error: 'Variable is not set' }
  }

  // URL validation for VITE_SUPABASE_URL
  if (name === 'VITE_SUPABASE_URL' && !validateUrl(value)) {
    return { variable: name, status: 'invalid', error: 'Must be a valid URL' }
  }

  // Non-empty validation for keys
  if (name.includes('KEY') && value.trim().length === 0) {
    return { variable: name, status: 'invalid', error: 'Must not be empty' }
  }

  return { variable: name, status: 'valid' }
}

async function loadEnvFile(): Promise<Record<string, string>> {
  const envPath = '.env'
  const env: Record<string, string> = {}

  if (await exists(envPath)) {
    const content = await Deno.readTextFile(envPath)
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      // Skip comments and empty lines
      if (trimmed.startsWith('#') || trimmed === '') {
        continue
      }

      // Parse KEY=VALUE format
      const match = trimmed.match(/^([^=]+)=(.*)$/)
      if (match) {
        const [, key, value] = match
        // Remove quotes if present
        const unquoted = value.replace(/^["']|["']$/g, '')
        env[key] = unquoted
      }
    }
  }

  return env
}

function printResult(result: ValidationResult): void {
  const icon = result.status === 'valid' ? '✓' : '✗'
  const color = result.status === 'valid' ? '\x1b[32m' : '\x1b[31m'
  const reset = '\x1b[0m'

  console.log(`  ${color}${icon}${reset} ${result.variable}`)
  if (result.error) {
    console.log(`    ${result.error}`)
  }
}

async function main() {
  console.log('Snaplog - Environment Check')
  console.log('==============================================\n')

  // Load .env file
  const env = await loadEnvFile()
  const envFileExists = await exists('.env')

  if (!envFileExists) {
    console.warn('  ⚠ .env file not found. Using system environment variables.\n')
  } else {
    console.log('  ✓ .env file found\n')
  }

  // Check required variables
  console.log('Required variables:')
  console.log('------------------')
  const requiredResults: ValidationResult[] = []

  for (const { name } of REQUIRED_VARS) {
    const value = env[name] || Deno.env.get(name)
    const result = validateEnvVar(name, value)
    requiredResults.push(result)
    printResult(result)
  }

  // Check optional variables
  console.log('\nOptional variables:')
  console.log('------------------')

  for (const { name, default: defaultValue } of OPTIONAL_VARS) {
    const value = env[name] || Deno.env.get(name) || defaultValue
    const result = validateEnvVar(name, value)
    printResult(result)
  }

  // Summary
  console.log('\nSummary:')
  console.log('--------')

  const hasErrors = requiredResults.some(r => r.status !== 'valid')

  if (hasErrors) {
    console.error('\x1b[31m  ✗ Environment check failed. Please fix the errors above.\x1b[0m')
    Deno.exit(1)
  } else {
    console.log('\x1b[32m  ✓ All required environment variables are set correctly.\x1b[0m')
    Deno.exit(0)
  }
}

main()
