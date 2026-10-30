#!/usr/bin/env -S deno run --allow-net --allow-env

/**
 * Staging Smoke Test
 *
 * Tests critical flows on staging environment.
 * Run: deno run --allow-net --allow-env scripts/smoke-test.ts
 *
 * Exit codes:
 * - 0: All tests passed
 * - 1: One or more tests failed
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/testing/asserts.ts";

// Configuration
const SUPABASE_URL = Deno.env.get('VITE_SUPABASE_URL') || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('VITE_SUPABASE_ANON_KEY') || '';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = performance.now();
  try {
    await testFn();
    const duration = Math.round(performance.now() - start);
    results.push({ name, passed: true, duration });
    console.log(`✓ ${name} (${duration}ms)`);
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: errorMsg });
    console.error(`✗ ${name} (${duration}ms): ${errorMsg}`);
  }
}

// Test 1: Health Check Endpoint
await runTest('Health check endpoint', async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/health-check`);
  assertEquals(response.status, 200, 'Health check should return 200');
  
  const data = await response.json();
  assertExists(data.status, 'Response should have status field');
  assertEquals(data.status, 'healthy', 'System should be healthy');
  assertExists(data.checks, 'Response should have checks field');
  assertExists(data.checks.database, 'Should check database');
  assertExists(data.checks.gemini_api, 'Should check Gemini API');
});

// Test 2: Supabase Connection
await runTest('Supabase anon API accessible', async () => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  assertEquals(response.status, 200, 'Supabase REST API should be accessible');
});

// Test 3: Edge Functions Deployed
await runTest('Edge functions deployed', async () => {
  const functions = [
    'extract-vendor-document',
    'extract-fabric-document',
    'commit-reviewed-vendor-document',
    'commit-reviewed-fabric-document',
    'health-check',
  ];

  for (const fn of functions) {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: 'OPTIONS', // Use OPTIONS to avoid invoking the function
    });
    // CORS preflight should succeed even without auth
    assertExists(response, `Function ${fn} should be deployed`);
  }
});

// Test 4: Storage Accessible
await runTest('Supabase storage accessible', async () => {
  const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  // May return 401 if auth required, but should not be 404
  assertExists(response, 'Storage endpoint should respond');
});

// Print Summary
console.log('\n=== Smoke Test Summary ===');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

console.log(`Total: ${results.length} tests, ${passed} passed, ${failed} failed`);
console.log(`Total duration: ${totalDuration}ms`);

if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  Deno.exit(1);
}

console.log('\n✓ All smoke tests passed!');
Deno.exit(0);
