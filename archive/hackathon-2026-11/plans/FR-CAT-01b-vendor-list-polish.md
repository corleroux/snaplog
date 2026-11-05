# FR-CAT-01b — Vendor list fixes: gripless reorder, no horizontal overflow, true item counts

**Branch:** `task/fr-cat-01b-vendor-list` off `staging` (functional + demo-visible polish — NOT the design branch; see below) · **Priority:** P0 (demo shows this screen; the count is currently wrong) · **Effort:** ~3–4h
**Satisfies:** FR-CAT-01 (vendor level truthfully represents its items); SUB-02 demo legibility.
**Depends on:** nothing (current UI only). DES-02C2 must carry all three fixes into the reskin — recorded here as the source of truth.

**Decision:** fix all three in the current UI on `staging`, because the Tue 12:00 fallback may ship exactly this layout in the demo, and the count fix is data correctness both UIs need. This is owner-directed demo polish with reviewer pass — not reskin work, so the design quarantine does not apply; DES-02C2's mandatory interaction inventory must include this screen and preserve all three behaviours.

## 1. RED — remove grip icons, keep reorder (~1–2h)

Possible — the sensors already allow it. `SortableVendorItem` (`VendorListScreen.tsx:422-447`) moves `{...attributes} {...listeners}` from the grip `div` onto the card root, deletes the grip element, and moves `touch-none` with it. TouchSensor is already `delay: 150, tolerance: 5` (long-press to lift; quick scrolls/swipes unaffected) and PointerSensor `distance: 8` (tap-to-open still fires). **Real risk, not a blocker:** the card also hosts `SwipeActions` (horizontal swipe) and list scroll — three gestures on one surface. Verdict stands ONLY with an on-device QA gate (scroll vs long-press-drag vs swipe vs tap vs keyboard reorder via the existing KeyboardSensor; card root must stay focusable with visible focus). If swipe-vs-drag proves unresolvable on device, fallback is a slimmer grip (dot, no icon box) — decide on-device, not in review.

## 2. GREEN — kill the horizontal overflow (~30 min)

The bottom ◀━━▶ bar is horizontal overflow, not vertical scroll (vertical `overflow-y-auto` on the list is correct and stays for long lists). Likely culprit: the untruncated long name breaking the flex chain and clipping the count badge (same root cause as the cut-off badge). Fix: verify the shrink chain (`min-w-0` at every flex level down to the title), single-line `truncate` on the name, keep the count chip `whitespace-nowrap flex-shrink-0`, add an `overflow-x-clip` guard on the list container. Acceptance is behavioural: no horizontal scrollbar at 360px with the longest vendor name, badge fully visible, vertical scroll retained.

## 3. PURPLE — true item counts (~1–2h)

`vendor.styleCount` (`vendorRepository.ts:93-99`) counts fabric styles only, so garment/video vendors read "0". Change: count `catalogue_items` per vendor too (video items land there post-commit — verify, don't assume), sum both, rename field `styleCount` → `itemCount` through mapper + tests (mechanical; update `vendorListDetail.test.ts` mocks), relabel chip to "1 item" / "N items" / "0 items" with correct pluralisation. Audit every other `styleCount` consumer (vendor detail header at minimum; unified styles screen untouched).

## Acceptance

Grip gone, reorder works via long-press (device QA signed); zero horizontal overflow at 360px; badge shows true summed counts; `pnpm lint && pnpm check && pnpm test:run` + existing e2e green with updated mocks; reviewer P0 pass (+ design-reviewer for the RED interaction change); merges to `staging` on pass.

## Risks / verify first

- RED lives or dies on-device — emulator QA is not sufficient for the three-gesture coexistence.
- Confirm video items land in `catalogue_items` before summing (else the count is wrong in a new way).
- Record all three behaviours in the DES-02C2 inventory when the reskin reaches this screen — no silent regressions.
