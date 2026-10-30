/**
 * Extraction provider factory (FR-MOD-01, FR-MOD-02a).
 *
 * Resolves the active provider from the EXTRACTION_PROVIDER edge secret.
 * Default: muse-spark (Meta Model API) since FR-MOD-02a — the demo runtime
 * must be all-Meta per the event rule. Gemini stays registered as the
 * baseline and is the FR-MOD-03 fallback candidate. Failing loudly on an
 * unknown provider is intentional — silent fallback between providers
 * lands with FR-MOD-03.
 *
 * Feature code imports this module only; it never imports provider modules
 * directly.
 */

import { geminiProvider } from './geminiProvider.ts'
import { museSparkProvider } from './museSparkProvider.ts'
import type { ExtractionProvider } from './types.ts'

const AVAILABLE_PROVIDERS = ['gemini', 'muse-spark'] as const

export function getProvider(): ExtractionProvider {
  const configured = (Deno.env.get('EXTRACTION_PROVIDER') || 'muse-spark').trim().toLowerCase()

  switch (configured) {
    case 'gemini':
      return geminiProvider
    case 'muse-spark':
      return museSparkProvider
    default:
      throw new Error(
        `Unknown EXTRACTION_PROVIDER "${configured}". ` +
          `Available providers: ${AVAILABLE_PROVIDERS.join(', ')}`
      )
  }
}
