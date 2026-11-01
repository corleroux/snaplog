# Benchmark results (FR-MOD-04)

> DRY RUN — recorded fixtures only, no live models. Live numbers land here after the owner-approved run (Tue).

| Provider | Model | Captures (matched/scored) | Mean accuracy | Mean latency (ms) | Cost/item (USD) |
|---|---|---|---|---|---|---|
| gemini (legacy baseline) | gemini-flash-lite-latest | 2 (53/53) | 100.0% | n/a (recorded) | n/a |
| muse-spark | muse-spark-1.3 | 3 (59/71) | 83.1% | n/a (recorded) | $0.0050 avg |
| muse-spark-open | meta-models/Muse-Spark-Open-816B-A42B | 2 (53/53) | 100.0% | n/a (recorded) | $0.0025 avg |

## Method

Same captures × each provider, scored field-by-field against hand-labelled ground truth with the real schema normaliser (`extractionNormaliser.ts`): normalised string/number match counts; null-vs-value counted both ways (missing expected value, or guessed value where null was correct — the never-guess rule rewards abstention). Cost = usage × hard-coded Standard price table (Muse Spark $1.25 in / $4.25 out per Mtok; same for Spark Open).

Exact string match is a **lower bound**: a semantically correct but wordier extraction (e.g. "Denim Trucker Jacket" vs ground truth "Jacket") scores as a mismatch. Translation quality and semantic equivalence are spot-checked manually per PRD §8.4 on the live run.

## Failure patterns

- web-garment-05 / muse-spark: guess item.item_code (expected null, got "UNKNOWN")
- web-garment-05 / muse-spark: guess item.name (expected null, got "Levi's Light Wash Denim Trucker Jacket")
- web-garment-05 / muse-spark: mismatch item.garment_type (expected "Jacket", got "Denim Trucker Jacket")
- web-garment-05 / muse-spark: guess item.silhouette (expected null, got "Type III trucker silhouette with cropped straight hem")
- web-garment-05 / muse-spark: guess item.construction (expected null, got "Point collar, chest yoke seam, two button-flap chest pockets, two lower side welt pockets, vertical front seaming, long sleeves with button cuffs, button-adjustable hem band, contrast topstitching")
- web-garment-05 / muse-spark: mismatch item.fabric_composition (expected "Denim", got "Light wash cotton denim")
- web-garment-05 / muse-spark: mismatch item.closure (expected "Button", got "Center front metal button closure")
- web-garment-05 / muse-spark: mismatch item.neckline (expected "Collar", got "Point shirt collar with V-opening")
- web-garment-05 / muse-spark: mismatch item.sleeve (expected "Long sleeve", got "Long set-in sleeve with button cuff")
- web-garment-05 / muse-spark: mismatch item.fit (expected "Regular", got "Regular fit")
- web-garment-05 / muse-spark: mismatch item.colourways.0.colour_name (expected "Light blue", got "Light Blue Wash")
- web-garment-05 / muse-spark: guess item.colourways.0.variant_name (expected null, got "Light Wash Denim")

## Notes

- Gemini rows are legacy-baseline context (fixtures/write-up); Gemini is never called live and is not a scored demo provider.
- Muse Spark ran in Standard mode (hard-pinned; contributor output can never appear here).
- Garment leg provisional on web captures until the shoot; video rows need the Modal endpoint + live runs.
- Rack-video entries are not scored by this runner (item isolation is the video pipeline's job); expected counts tune after the first Modal run.
- `N/A` / `UNKNOWN` strings instead of null (`item.item_code`, `item.name` on garment-05) — prompt hardening for the benchmark: "use null, never write N/A or UNKNOWN".
