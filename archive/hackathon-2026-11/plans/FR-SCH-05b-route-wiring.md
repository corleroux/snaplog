# FR-SCH-05b — Wire the orphaned catalogue routes into the buyer UI (pre-design)

**Branch:** `task/fr-sch-05b-route-wiring` off `staging` (functional demo plumbing — NOT the design branch; explicitly exempt from the design quarantine) · **Priority:** P0 (scripted demo cannot run without it) · **Effort:** ~3–4h
**Satisfies:** FR-SCH-05 (the buyer can actually reach the schema-driven flow); SUB-02 garment (1:15–2:00) and video blocks.
**Depends on:** ⑨ merged (routes + functions exist). Design branch untouched.

**Decision:** two minimal links in the CURRENT UI — one entry, one exit. No reskin, no new flows, no behaviour change to legacy paths. The in-flow picker (`CatalogueItemCaptureFlow` picker step) already branches fabric→legacy, garment→in-flow, video→`items/video`, so ONE entry link unlocks all three demo paths.

## Files

1. **Entry (~1h):** vendor detail screen (locate via `VendorDetailFromRouteWithProvider`) — point its capture affordance at `items/new/capture` (the picker hub), replacing the direct legacy-fabric link on that screen. The picker hands fabric back to `styles/new/capture`, so the fabric path is preserved with one extra tap — which is demo-positive (the picker IS the "config, not code" moment). Keep the StyleList FAB → legacy direct as the fast fabric path. Do not touch any other legacy entry.
2. **Exit/visibility (~2h):** vendor page gains an "Items" section reading `catalogue_items` by `vendor_id` (nothing in `src` reads that table today — grep-verified). Render cards: thumbnail, name/garment-type, key fields, REVIEW badge on low-confidence. Build it as an isolated section component so the DES-02C2 reskin ports it cleanly. This answers "which table the demo reads": fabric → `fabric_styles` via the legacy list (unchanged); garments + video items → `catalogue_items` via this section. Exactly one lane per category, no duplication.
3. **G1 guard (rides along, ~15 min):** `catalogueRouteWrappers.tsx` — `!eventId || !vendorId` → redirect to vendor list (replace) or `ErrorState`. Never start a session/extract on empty ids (prevents silent mis-saves in rehearsals).

**Out of scope:** any reskin (design branch), review-screen functional core (⑨/N3), Unassigned inbox (R-01, parked).

## Acceptance

No hand-typed URLs: vendor page → capture entry → picker → garment → extract → review → commit → vendor page shows the garment card; picker → video → back works; `pnpm lint && pnpm check && pnpm test:run` + existing e2e green with zero fabric-path changes; reviewer P0 pass; merges to `staging` on pass (demo plumbing can't wait for design sign-off).

## Risks / verify first

- The vendor detail screen's current capture affordance shape (FAB vs button) — match it, don't redesign it.
- Keep the new section component free of fabric-only assumptions (design-reviewer rule applies to new UI too).
- If ⑨ hasn't merged, this plan waits — it wires what ⑨ built.
