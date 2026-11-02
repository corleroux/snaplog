# DESIGN-02C2a — Stream C port: chrome + capture

**Branch:** `task/design-rework` ONLY · **Priority:** P1 (after DES-02C1 DONE) · **Effort:** ~3–4h
**Parent:** DESIGN-02C2 master gate (inventory-first, frozen functionality, owner sign-off). **Status (Mon Nov 2):** not started.

## 1. Chrome — `BottomNavigation.tsx` + headers

Current inventory (must survive): Home/Events tabs with active state (Events matches any `/events*`), Search + Profile actions via GlobalOverlay (profile menu: Admin/Settings/Sign-out), centre FAB (`onAddPress` prop — routing is caller's, never hardcode), Feedback button, SVG hump shape. The FAB fill is hardcoded `#E8611A` — tokenise to Stall `#E34A0B` with Ink icon per DESIGN-HANDOFF (buttons use Ink text/icon, not white — verify 720p). Restyle `PageHeader`/`AppHeader` surfaces to tokens; add no logo placement unless the prototype chrome shows one and it routes nowhere (pure mark only).

## 2. Capture — BOTH flows, inventory first

- **Picker hub** `CatalogueItemCaptureFlow`: catalogue-type picker (registry-driven incl. video entry → `items/video`), capture, processing spinner, review (C2c), success landing on the styles list. Fabric/vendor picker choices hand off to legacy flows — preserve exactly.
- **Legacy fabric** `StyleCaptureFlow` (FAB fast path): preserve as a separate flow; do not merge flows.
- **Non-negotiable (prototype omits it):** `CaptureSessionPanel` info-image classification toggle — mark one image Info vs gallery (`onClassificationToggle`, Info/Gallery badges, "Mark an image as Info" banner), validation errors, cancel-with-images confirmation dialog, permission-denied toast, hidden file input. All must survive pixel-moved.
- Vendor is fixed by route `vendorId`; no vendor picker at capture, no vendor-less capture.

## Acceptance

Master-gate acceptance; FAB/picker routing byte-identical (click-through both flows at 720p); info-toggle demonstrably works after restyle.

## Risks

- Overlay/toggle hit-areas are the easiest silent breakage — test on device, not just screenshots.
