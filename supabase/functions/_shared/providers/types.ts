/**
 * Provider interface for AI extraction (FR-MOD-01).
 *
 * One interface for every extraction provider: image(s) + schema in,
 * structured JSON + usage out. Feature code (edge functions, Modal jobs)
 * goes through getProvider() and never imports a provider SDK — all
 * model-specific code lives in the provider modules in this directory.
 *
 * Providers: Gemini (baseline), Muse Spark via Meta Model API, a Meta
 * open-weights model on Modal.
 */

import type { CatalogueSchema } from '../catalogueSchemaRegistry.ts'

/** A single image sent to a provider, base64-encoded (no data: prefix). */
export interface ProviderImage {
  base64: string
  mimeType: string
}

/**
 * Token usage and cost estimate for one extraction run.
 * Pricing lands with FR-MOD-04; until then costUsd is null/absent.
 */
export interface ProviderUsage {
  inputTokens?: number
  outputTokens?: number
  costUsd?: number | null
}

/** Input to ExtractionProvider.extract(). */
export interface ExtractionRequest {
  /**
   * Source images in order. An array because SAM 3.1 video isolation
   * (FR-VID-*) and Muse Spark need multi-image input.
   */
  images: ProviderImage[]
  /** Versioned catalogue schema that drives prompt, parsing and normalisation. */
  schema: CatalogueSchema
  /** Optional scan type; selects the schema's scan-type guidance text. */
  scanType?: string
}

/** Output of ExtractionProvider.extract(). */
export interface ExtractionResult {
  /**
   * Schema-normalised extraction graph (e.g. { style: { ... } }). Values are
   * trimmed/typed per the schema; missing or malformed fields are null —
   * providers must never fill in defaults (FR-EXT-06).
   */
  json: unknown
  /** Raw model output text, preserved for the raw_payload audit chain. */
  raw: string
  /** Provider id, e.g. 'gemini'. */
  provider: string
  /** Model id that produced the output, e.g. 'gemini-flash-lite-latest'. */
  model: string
  /** Token usage, or null when the provider does not report it. */
  usage: ProviderUsage | null
  /** Wall-clock extraction latency in milliseconds. */
  latencyMs: number
  /**
   * Optional field-level confidences keyed by schema field path. Absent/null
   * when the provider does not report them; the review flow flags
   * low-confidence fields instead of guessing (FR-EXT-06).
   */
  confidences?: Record<string, number> | null
}

/** The single provider interface every extraction goes through. */
export interface ExtractionProvider {
  /** Stable provider id used in extractor_name and scan_sessions.provider. */
  readonly name: string
  extract(request: ExtractionRequest): Promise<ExtractionResult>
}
