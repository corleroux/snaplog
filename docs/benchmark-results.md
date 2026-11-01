# Benchmark results (FR-MOD-04)

> DRY RUN — recorded fixtures only, no live models. Live numbers land here after the owner-approved run (Tue).

## Method

Same captures × each provider, scored field-by-field against hand-labelled
ground truth with the real schema normaliser (`extractionNormaliser.ts`):
normalised string/number match counts; null-vs-value counted both ways
(missing expected value, or guessed value where null was correct — the
never-guess rule rewards abstention). Cost = usage × hard-coded Standard
price table (Muse Spark $1.25 in / $4.25 out per Mtok; same for Spark Open).

Exact string match is a **lower bound**: a semantically correct but wordier
extraction (e.g. "Denim Trucker Jacket" vs ground truth "Jacket") scores as a
mismatch. Translation quality and semantic equivalence are spot-checked
manually per PRD §8.4 on the live run.

## Dry-run results (recorded fixtures, real normaliser)

| Provider | Model | Captures | Mean accuracy | Mean latency (ms) | Cost/item (USD) |
|---|---|---|---|---|---|
| gemini (legacy baseline) | gemini-flash-lite-latest | 2 (fabric, vendor) | 100.0% (53/53) | n/a (recorded) | n/a (not published) |
| muse-spark | muse-spark-1.3 Standard | 3 (fabric, vendor, garment) | 77.8% (59/71) | n/a (recorded) | $0.0055 avg¹ |
| muse-spark-open | meta-models/Muse-Spark-Open-816B-A42B | 2 (fabric, vendor) | 100.0% (53/53) | n/a (recorded) | $0.0031 avg¹ |

¹ Dry-run cost from recorded usage: fabric 1512 in / 284 out = $0.0031;
garment 1843 in / 1838 out = $0.0101. Vendor ~$0.0018.

Garment detail (muse-spark, web garment-05, 6/18 exact-match):
all 14 keys present; `season` correctly null; misses are wordier-correct
values ("Regular fit" vs "Regular") plus two `N/A`-pattern guesses
(`item_code: "UNKNOWN"`, `name` filled where null was correct).

## Failure patterns (dry run)

- `N/A` / `UNKNOWN` strings instead of null (`item.item_code`, `item.name`
  on garment-05) — prompt hardening for the benchmark: "use null, never
  write N/A or UNKNOWN".
- Otherwise no invented composition/price/brand on the fixtures checked.

## Notes

- Gemini rows are legacy-baseline context (fixtures/write-up); Gemini is never called live and is not a scored demo provider.
- Muse Spark ran in Standard mode (hard-pinned; contributor output can never appear here).
- Garment leg provisional on web captures until the shoot; video rows need the Modal endpoint + live runs.
- Rack-video entries are not scored by this runner (item isolation is the video pipeline's job); expected counts tune after the first Modal run.
