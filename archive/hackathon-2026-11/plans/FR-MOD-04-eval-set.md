# FR-MOD-04 — Eval set assembly (prerequisite)

**Branch:** `task/fr-mod-04-eval-set` · **Priority:** P0 prerequisite · **Effort:** ~5h including the shoot
**Satisfies:** the "same real captures" input of FR-MOD-04; PRD §8 steps 1–2. Data only — no product code; no FR closes on its own.

**Decision: hybrid sourcing.** Export existing real captures (composition tags, swatches, business cards, stall fronts) read-only from the production `scan-originals` bucket; shoot fresh only what the new category needs (garments, rack-walk video). Reason: existing captures are real trade-fair data at zero capture cost and already multi-language; only garments are new. Close alternative — an all-fresh session: cleaner permissions but costs half a day and loses the glare/blur/clutter the benchmark must report on.

## Files

- `eval/README.md` — manifest format; labeling rules (null only where truly absent; tag blur/glare/mixed-language/clutter).
- `eval/manifest.json` — per capture: id, file, class (`composition_tag|swatch|garment|business_card|stall_front|rack_video`), source (`existing|fresh`), schema slug, ground truth mirroring the schema's payload shape, languages, failure tags. Video entries list expected distinct items.
- `eval/captures/` — gitignored; read-only export (no remote mutations) plus fresh shots. Serving strategy is decided in the FR-MOD-04 runner plan.
- `scripts/validate-eval-manifest.ts` (deno, like `scripts/smoke-test.ts`) — checks files exist, enums valid, class counts meet targets.

**Targets (~50):** ≥15 composition tags in ≥3 languages; ~8 swatches; ~10 business cards; ~5 stall fronts (existing where available — inventory storage first); ~12–15 fresh garment photos; 2–3 rack-walk videos (30–60 s).

## Acceptance

`deno run --allow-read scripts/validate-eval-manifest.ts` passes; five entries spot-checked in a second pass; `pnpm lint && pnpm check` green; no app code changed.

## Risks / verify first

- PII: real vendor cards — owner's explicit OK required; keep them out of published material and the demo video unless cleared.
- Inventory existing captures (read-only SQL) before promising counts.
- Rack access for the weekend shoot — it also feeds the demo recording.
- Timebox labeling to ~3 h: 50 honest labels beat 80 unfinished.
