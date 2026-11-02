# FR-CAT-01 — Unified styles screen (fabric + catalogue items)

**Branch:** `task/fr-cat-01-unified-styles` off `staging` · **Priority:** P0 (owner directive; demo must show saved garments) · **Effort:** ~3h
**Satisfies:** FR-CAT-01. **Supersedes** FR-SCH-05b §2 one-lane split (fabric→legacy list, garments→vendor section).

**Decision:** the styles screen becomes the single per-vendor catalogue view (`fabric_styles` + `catalogue_items` incl. video items). The vendor-page `CatalogueItemsSection` is REMOVED — usage in `VendorDetailScreen` deleted, component + test deleted with the fetch reborn as the hook below. The vendor page already has a "View Vendor Styles" CTA, so no second lane remains and nothing renders twice.

## Files

1. New `src/features/catalogue/hooks/useCatalogueItemsQuery.ts`: TanStack `useQuery(['catalogue-items', vendorId])` — active `catalogue_items` by vendor, plus thumbnails from `scan_sessions` via `item_id` (public `source_image_url`; the items table has no image column). Verify-before-build: whether post-commit rows populate `source_image_url` or only `source_image_path` (re-sign via scan-originals bucket if the latter).
2. New mapper (`toStyleRecord`, same feature): name←name||item_code, sku←item_code, composition←garment summary line (reuse the section's `summaryLine`), images←scan-session URL or `[]` (StyleCard's SVG fallback covers it), status 'active'. ALL searched string fields must default to `''` — the list screen calls `.toLowerCase()` unguarded. Prefix mapped ids `ci-<uuid>`.
3. `src/app/styleRouteWrappers.tsx`: merge fabric + mapped rows, sort desc together, derive `filterOptions` from the merged list (schema_type surfaces as a category chip); guard `onToggleShortlist` and `onStyleClick` by `ci-` prefix (no-ops for catalogue rows — fabric detail/shortlist write paths untouched); add a `catalogue_items` realtime refresh alongside the fabric one.
4. `src/app/catalogueRouteWrappers.tsx`: commit success/cancel navigates to the styles list (was the vendor page). `StyleCard`: optional `shortlistable` prop (default true; false hides the heart for catalogue rows) — fabric rendering byte-identical. Neutralise "No styles yet / fabric styles" empty-state copy to category-neutral.

## Acceptance

Capture garment → lands on the styles screen showing its card (thumbnail-or-fallback, name, summary, REVIEW/AI badge); fabric rows unchanged; `pnpm lint && pnpm check && pnpm test:run` + existing e2e green; reviewer P0 + design-reviewer passes.

## Risks / verify first

- RLS SELECT on `catalogue_items` granted in 085 — confirm as event member; a failed items query degrades to fabric-only, never blocks the list.
- Video rows render as garment cards (minimal acceptable; item detail screen is out of scope).
- Batch export will include mapped rows with mostly-empty columns — acceptable, no change.
- Do NOT touch the fabric write path; current UI only (design quarantine respected).
