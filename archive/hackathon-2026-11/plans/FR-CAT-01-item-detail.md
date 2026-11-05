# FR-CAT-01 — Catalogue item detail page (garment/video)

**Branch:** `task/fr-cat-01-item-detail` off `staging` · **Priority:** P0 · **Effort:** ~3–4h
**Satisfies:** FR-CAT-01 (Event→Vendor→Item→Variant for non-fabric). **Lifts** the `ci-` click guard from `FR-CAT-01-unified-styles.md`. FR-CAT-02/03/04 out.

**Decisions (owner directive):** mirror `StyleDetailScreen` structure/sections/nav. **Launch = read-only + re-capture; no edit UI** (scope guard). **Shortlist: NO** (fabric-only). **Approval: OUT** (approvals are `entityType=style`; list REVIEW badge covers state). Comments/assignments/inventory/pricing/QR: OUT.

## Files
1. New `useCatalogueItemDetail` hook (`src/features/catalogue/hooks/`): TanStack query — one `active` `catalogue_items` row by `id + vendor_id`, variants from `catalogue_item_variants` (active), images from `scan_sessions` via `item_id` (reuse `useCatalogueItemsQuery` thumbnail resolver). RLS event-member SELECT already in migration 085 — confirm.
2. New `ItemDetailScreen.tsx` (`src/features/catalogue/screens/`): `AppShell` + `PageHeader` (back), gallery (reuse `StyleImageGallery`), schema-driven fields block (`extracted_fields` + type/version badge), variants/colourways, `ExtractionWarnings` reuse, archive button. Loading/`ErrorState` mirror fabric.
3. `src/app/styleRouteWrappers.tsx` + `App.tsx` route `.../vendors/:vendorId/items/:itemId`: `ItemDetailFromRouteWithProvider` — strip `ci-`, validate UUID, vendor-scope check; unknown id → `ErrorState` + Back to Styles. Archive (canEdit-gated) → list. List `onStyleClick`: `ci-<uuid>` → `items/<uuid>`; back-target parity `→ .../styles`.

## Acceptance
Tap garment → detail (hero, schema fields, variants, warnings); unknown id errors cleanly; `pnpm lint && pnpm check && pnpm test:run` (+ `build` for routing); reviewer P0 + design-reviewer pass.

## Risks / verify first
Video rows render same page (acceptable). UUID validation so fabric ids never collide. Realtime: reuse list refresh pattern. Quarantine: current-UI only, don't touch fabric path. Tests: Vitest hook + screen; extend `e2e/garment-capture.spec.ts` list→detail.
