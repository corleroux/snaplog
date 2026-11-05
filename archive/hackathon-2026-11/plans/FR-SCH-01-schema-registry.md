# FR-SCH-01 — Catalogue schema registry

**Branch:** `task/fr-sch-01-schema-registry` · **Priority:** P0 · **Effort:** ~4h
**Satisfies:** FR-SCH-01. Groundwork for FR-SCH-03/04; FR-SCH-02 completes in the FR-MOD-01 plan.

**Decision:** DB-backed registry (`catalogue_types` table), not JSON files in `_shared` — it matches the PRD "Catalogue type" entity, gives edge functions, the client (FR-SCH-05) and Modal one source of truth, and makes FR-SCH-03 a pure INSERT. JSON-in-`_shared` is the close alternative but needs a second consumption path for the client.

## Files

- `supabase/migrations/083_catalogue_types.sql` (082 is latest — verify at branch time): `catalogue_types` (id, slug, kind ∈ {catalogue_type, document}, display_name, version int, schema jsonb, is_active, created_at; unique(slug, version)). RLS enabled; SELECT for authenticated; no client write policies. Seeds:
  - `fabric` v1 (catalogue_type) — faithful transcription of the fields, scan-type guidance, translation and null rules currently hardcoded in `extract-fabric-document/index.ts:210-282` plus its payload types (lines 60-112).
  - `vendor` v1 (document) — same, from `extract-vendor-document/index.ts` (prompt + types), so vendor extraction uses the same interface later.
- `supabase/functions/_shared/catalogueSchemaRegistry.ts`: `loadSchema(slug)` → `{ slug, version, schema }`; in-isolate cache; shape validation (non-empty fields, known types, nested `group`/`multiple` for variants→price).
- Schema format carries: path, type, label, extraction hint, allowed values, document-level translate-to-English, scan-type guidance. Leave per-field `confidence` optional for FR-EXT-06.
- Tests: `supabase/functions/_tests/catalogueSchemaRegistry.test.ts` (seeds load, cache hit); RLS cases appended to `src/features/styles/api/__tests__/styles.rls.test.ts`.

**No extraction code changes in this task.** The Gemini flow is untouched.

## Acceptance

`supabase start` → `pnpm test:edge`; `pnpm test:rls`; `pnpm lint && pnpm check && pnpm test:run`; `pnpm test:e2e -- e2e/fabric-capture.spec.ts` (mocked Gemini) still green.

## Risks / verify first

- Transcription fidelity — behaviour parity in FR-MOD-01 depends on it.
- Schema JSON must cover every current fabric/vendor field, including `metadata` passthrough.
- Migration stays local; never push to the shared Supabase project unasked.
