/**
 * Extraction provider factory (FR-MOD-01).
 *
 * Resolves the active provider from the EXTRACTION_PROVIDER edge secret
 * (default: gemini). Failing loudly on an unknown provider is intentional —
 * silent fallback between providers lands with FR-MOD-03.
 *
 * Feature code imports this module only; it never imports provider modules
 * directly.
 */

import { geminiProvider } from './geminiProvider.ts'
import type { ExtractionProvider } from './types.ts'

const AVAILABLE_PROVIDERS = ['gemini'] as const

export function getProvider(): ExtractionProvider {
  const configured = (Deno.env.get('EXTRACTION_PROVIDER') || 'gemini').trim().toLowerCase()

  switch (configured) {
    case 'gemini':
      return geminiProvider
    default:
      throw new Error(
        `Unknown EXTRACTION_PROVIDER "${configured}". ` +
          `Available providers: ${AVAILABLE_PROVIDERS.join(', ')}`
      )
  }
}
