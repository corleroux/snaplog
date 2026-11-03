import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for DEMO-01 demo-video footage ONLY.
 *
 * Separate from playwright.config.ts (the CI e2e config — do not touch it):
 * - testDir is e2e/demo and testMatch requires the `.demo.ts` suffix, so the
 *   default config (`pnpm test:e2e`) never picks these specs up.
 * - `video: 'on'` records every run; footage lands in test-results/demo
 *   (gitignored) and is assembled by HyperFrames — never committed.
 * - Runs against the LOCAL stack only (see e2e/demo/demo-capture.demo.ts).
 *
 * Invoke: pnpm test:e2e:demo   (app dev server must already be running)
 */
export default defineConfig({
  testDir: './e2e/demo',
  testMatch: '**/*.demo.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 300_000,
  outputDir: 'test-results/demo',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    video: 'on',
    trace: 'off',
    screenshot: 'off',
    launchOptions: {
      // Slow every action down so the recording is watchable as footage.
      slowMo: Number(process.env.DEMO_SLOWMO_MS || 350),
    },
  },

  projects: [
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
})
