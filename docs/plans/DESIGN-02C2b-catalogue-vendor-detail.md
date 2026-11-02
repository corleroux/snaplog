# DESIGN-02C2b — Stream C port: catalogue + vendor + details

**Branch:** `task/design-rework` ONLY · **Priority:** P1 (after C2a) · **Effort:** ~4h
**Parent:** DESIGN-02C2 master gate. **Status (Mon Nov 2):** not started. This sub-plan supersedes the old C2 catalogue/vendor items — the merged list changed shape in PRs #30/#31.

## 1. Catalogue (styles) list — the unified screen

Current inventory (must survive): `StyleListScreen` merges fabric rows + catalogue (`ci-`) rows; text search (SKU/name/composition/supplierRef), category/season/status filters, Export modal, PullToRefresh, SwipeActions wrapper, `StyleCard` per row, FAB → legacy capture vs Add → picker hub split, Vendor-info + NotificationBell header actions, empty copy "No items yet / Add Your First Item".
- **`StyleCard` outer is an `<article>`, never revert to `<button>`** (nested shortlist `<button>` hydration rule; keyboard Enter/Space handler + conditional hover only when clickable).
- Fabric rows: shortlist heart + tap → style detail. Catalogue rows: no heart, `Review` / `Garment · AI` / `Video · AI` badge, tap → item detail. Keep the fabric/garment distinction obvious at 720p. Text search only — no visual-search entry (FR-CAT-03 cut).

## 2. Vendor page

Inventory: hero image, View Vendor Styles (primary), Edit Vendor Details, QRCodeButton, AssignmentSheet, Archive Vendor, Comments, extraction warnings, Basic Information. All are real — **wire-or-delete (old B3) does not apply; delete nothing.** NO Items section (removed in PR #30 — garments live on the styles list; do not re-add a second lane).

## 3. Detail screens (both)

`StyleDetailScreen` (gallery/lightbox, warnings, specs, variants, pricing, inventory, approval, assignments, comments, archive) and the NEW `ItemDetailScreen` (gallery/lightbox, warnings/review banner, schema Details, variants + colour swatches, archive, Back to Items) — port both; item detail is the garment demo landing and was absent from the original plan.

## Acceptance

Master-gate acceptance; list→both details click-through at 720p; no row renders twice anywhere.

## Risks

- Card/badge restyles must not reintroduce nested buttons or drop the `ci-` guards in `styleRouteWrappers.tsx`.
