# FR-SCH-03 — Garment schema + generalised item storage

**Branch:** `task/fr-sch-03-garment-schema` · **Priority:** P0 · **Effort:** ~8h
**Satisfies:** FR-SCH-03 (garment added as a second schema, no application code changes); FR-CAT-01 for non-fabric items; FR-SCH-04 (schema_version stamped on committed items).
**Depends on:** FR-SCH-01.

**Decision:** garment lands as an **INSERT into `catalogue_types`** — that insert *is* the FR-SCH-03 proof. Generalised storage is new, additive tables (fabric stays on `fabric_styles`, untouched): `catalogue_items` + `catalogue_item_variants` with `extracted_fields jsonb`, `schema_type`, `schema_version`, vendor/event FKs, status, source scan_session FK. The extraction/review/commit pipeline is category-agnostic — the demo claim is "garment was added by a schema row; the pipeline code didn't change."

## Files

- Migration (next number, verify at branch time): garment schema v1 INSERT (silhouette, garment_type, construction, fabric/composition, closure, neckline, sleeve, fit, sizing, colourway variant group — mirror PRD §1.2 garment fields, with the same translation/null extraction hints); `catalogue_items`/`catalogue_item_variants` DDL + RLS mirroring the `fabric_styles` patterns (event-scoped, owner write).
- Edge `supabase/functions/extract-catalogue-item/` (additive): takes `catalogue_type`, loads the schema, runs the provider interface — the single path for any non-fabric category; fabric/vendor functions stay untouched.
- Edge `supabase/functions/commit-reviewed-catalogue-item/` (additive): mirrors `commit-reviewed-fabric-document`; stamps `schema_type`/`schema_version`; preserves the raw → reviewed audit chain via scan_sessions.
- Tests: RLS cases (append alongside the `styles.rls.test.ts` pattern); commit edge test with a garment fixture; a unit test proving a schema INSERT alone drives `loadSchema('garment')` through prompt + normaliser.

## Acceptance

`supabase start` → `pnpm test:edge`; `pnpm test:rls`; `pnpm lint && pnpm check && pnpm test:run`. Observable: garment photo (mocked provider) → extract → review → commit produces a `catalogue_items` row with `schema_type='garment', schema_version=1`.

## Risks / verify first

Owner sign-off on the garment field list (demo relevance); fabric flow must stay byte-identical (existing e2e green); scan-type check on scan_sessions may need a garment value — widen the constraint, additive intent only.
