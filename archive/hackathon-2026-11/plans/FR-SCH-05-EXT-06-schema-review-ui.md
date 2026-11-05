# FR-SCH-05 + FR-EXT-06 — Schema-driven capture/review UI

**Branch:** `task/fr-sch-05-schema-review-ui` · **Priority:** P1 (kept — demo step 3 needs the category switch) · **Effort:** ~8h
**Satisfies:** FR-SCH-05 (capture UI adapts its fields and review screen to the active schema); FR-EXT-06 minimal (flag low-confidence or missing fields instead of guessing).

**Decision:** the client reads `catalogue_types` directly via supabase-js (RLS select granted in FR-SCH-01) — no new endpoint. Minimal scope: a catalogue-type picker plus schema-rendered review. Vendor flow untouched; fabric flow untouched.

## Files

- `src/features/catalogue/` (new): registry fetch + cache (select active `catalogue_types` rows).
- Capture flow: catalogue-type picker (vendor / fabric / garment); the garment path calls the additive `extract-catalogue-item` function (FR-SCH-03) with `catalogue_type`; a video entry point links to the FR-VID flow.
- Review screen: render fields from the schema (label, type, allowed values, nested variant/price groups); edits write `reviewed_payload` as today; commit via `commit-reviewed-catalogue-item`.
- FR-EXT-06 minimal: null/missing fields highlighted "not extracted — confirm or fill"; per-field confidences displayed when the provider supplies them; re-extraction never overwrites `reviewed_payload` (existing rule — add a regression test).
- Tests: Vitest (jsdom) for registry rendering and flagging; an e2e happy-path garment capture with mocked extraction.
- `DESIGN_SYSTEM.md` compliance; design-reviewer pass after landing.

## Acceptance

`pnpm lint && pnpm check && pnpm test:run`; `pnpm test:e2e` garment spec green. Observable: switching the picker to garments changes capture hints and review fields with no code fork — driven entirely by the registry row.

## Risks / verify first

Schema-rendered forms can balloon — restrict to the schema format's input types (string / number / enum / group) only; the fabric review UI must not regress (existing e2e stays green); thumb-friendly, one-handed use per the design system.
