# DESIGN-01 — Final design review feedback (brand folder vs brief)

**Author:** builder (consolidating `design-reviewer` passes) · **Date:** Sun Nov 01, 2026 · **Status:** final, read-only review — no code changed
**Inputs:** `docs/plans/DESIGN-01-opendesign-brief.md` (updated revision), `docs/brand/` (updated OpenDesign output), `DESIGN_SYSTEM.md` (stub), `docs/PRD.md`, live routing/code (`src/app/App.tsx`, `src/app/catalogueRouteWrappers.tsx`, `src/features/catalogue/…`)
**Passes consolidated:** (1) initial review, (2) re-review after brief + prototype revision, (3) vendor-locked-at-capture proposal assessment
**Related:** task ⑨ (`FR-SCH-05`/`FR-EXT-06` schema review UI), SUB-02 (logo sting, social creatives), `DESIGN_SYSTEM.md` (approved output replaces stub), R-01 (deferred late binding), `FR-SCH-03` (garment as config), `FR-CAT-02` (text search only — no visual search)

> This file is the build-team handoff for DESIGN-01. It is feedback only. Implementation happens in task ⑨ / tokens reskin. Do not treat the prototype HTML as shippable code — port tokens, chrome, states, and copy into the React + Vite + Tailwind v4 + shadcn new-york + Capacitor stack.

---

## 1. Executive verdicts

| Stream | Verdict | One line |
|---|---|---|
| Stream A — brand kit | **PASS** | All acceptance items present, no regressions across revisions |
| Stream B — social + sting | **PASS** | Editable HTML/SVG sources, safe-area aware; outstanding work is operational (export/record), not a gate failure |
| Stream C — app redesign | **CONDITIONAL PASS — 2 shippable gaps remain** | Prototype meets the implementability gate on tokens/schema/vendor/unconfig; close B3 + vendor-locked guard before ship |
| `DESIGN_SYSTEM.md` sufficiency | **Sufficient — copy-paste ready with 4 must-decide items** | `@theme` block, font install, primitive map, state matrix, fixed-vendor copy can be adopted verbatim |
| Tuesday AM feasibility | **Tokens reskin: YES (~1–2h). Full Stream C: ~1 day builder — tight, reskin-first** | Land reskin + icon/splash first; Stream C follows; overflow becomes `DESIGN_SYSTEM.md` "what's next" per brief Fallback |

**Shippable gaps (the only BLOCKs):**

1. **B3 (carried over) — stubbed toast buttons still ship in the prototype.** Wire to real handlers or delete before ship.
2. **G1 (new, ~1 line) — missing-`vendorId` guard.** `catalogueRouteWrappers.tsx` defaults `vendorId=''` with no redirect/404; never start session/extract with an empty id.

**Dropped by owner decision (not to build):**

- **N1 (vendor picker) — CLOSED.** Superseded by vendor-locked-at-capture (see §6). No picker to build.

**Doc-only fixes (1 line each):**

- **N2 — `DESIGN-HANDOFF.md:44`** still says "Tailwind extend block" — change to "Tailwind v4 `@theme` paste-block".
- **Brief `DESIGN-01:26`** Keep-clause vendor-picker sentence — replace with vendor-locked wording (exact text in §6.5).

---

## 2. Inputs reviewed

### 2.1 Brief (updated revision)

- Keep clause now reads: bottom nav + central `+` retained; context-aware logic is **vendor page → pre-filled vendor, elsewhere → must first enter a vendor page (no vendor-less capture)**. Vendor is **FIXED before capture (route `vendorId`) and DISPLAY-ONLY at review** (never a form field, never submitted). R-01 late binding explicitly out of scope: no assign-or-create during review, no Unassigned inbox.
- Stream C screen (2) is now "schema-driven review with confidence flags and pre-filled vendor display (vendor fixed at capture — no assign-or-create)".
- Corrections appended: (1) review shows garment field set, fields render from active schema never hardcoded; (2) Jobs "pipeline unconfigured" variant (export disabled + reason); (3) tokens re-emitted as Tailwind v4 `@theme` incl. danger trio; (4) body = system stack, IBM Plex Mono via bundled `@fontsource/ibm-plex-mono` (never a network link) for labels/numbers/prices only, Georgia/Times display for headings.
- Hard constraints unchanged and respected: stack-locked, scope guard (no accounts/billing/ordering/extra categories), narrative-neutral (no vendor-optional UI, no visual-search FR-CAT-03), demo-legibility (720p, sunlight contrast, tap targets).

### 2.2 Brand folder inventory (`docs/brand/`)

- `DESIGN-HANDOFF.md`, `DESIGN-MANIFEST.json`
- `snaplog-brand-kit.html` (Stream A), `snaplog-social-covers.html`, `snaplog-social-templates.html`, `snaplog-logo-sting.html` (Stream B), `snaplog-app-redesign.html` (Stream C, 33,689 bytes in revised pass)
- Assets: `snaplog-icon-*.png/svg` (1024/512/192/180/48), `snaplog-icon-fg-432.png` + `snaplog-icon-fg.svg` (transparent foreground), `snaplog-icon-bg-432.png` + `snaplog-icon-bg.svg` (flat `#16150F`), `snaplog-avatar.svg` + 98/512/48 PNGs, `snaplog-splash-dark/light-2732.svg/png`, `capacitor.zip`, 3 garment context photos, 9 reference screenshots of the current app (inputs — do not ship), `Snaplog-Trade-Fair-Brand-Kit.zip`

### 2.3 Live code cross-checked (routing reality)

- `src/app/App.tsx:313,323` — only item entry points are `/events/:eventId/vendors/:vendorId/items/new/capture` and `/items/video`. Both vendor-scoped. No vendor-less item route exists.
- `src/app/catalogueRouteWrappers.tsx:8,25` — `vendorId` defaults to `''` with no guard (source of G1).
- `src/features/catalogue/screens/CatalogueItemCaptureFlow.tsx:23-29,87-100,120` — `vendorId` is a required prop; picker is catalogue-type only (fabric/garment/vendor-type/video handoffs), never a vendor selector.
- `src/features/catalogue/hooks/useCatalogueItemCaptureFlow.ts:70-76,187-203,273-278` — `vendorId` flows into `uploadCaptureImage` / `createScanSession` / `extractCatalogueItem` / `commitCatalogueItem`, never from form state. Commit already throws on missing `vendorId`.
- `src/features/catalogue/screens/CatalogueItemReviewScreen.tsx:126-132` — renders `definition.schema.fields` only. No vendor form field. Compliant with vendor-locked.
- `src/features/catalogue/components/CatalogueTypePicker.tsx:23-26,39-44` — catalogue-type picker, not a vendor selector. Verified.
- Global `+` / FAB (`BottomNavigation.tsx:221`) is `onAddPress`-only; callers pass vendor-bound callbacks. No global `+` reaches `items/new/capture` without a vendor.

---

## 3. Stream A — brand kit: PASS

Acceptance was "SVG + PNG exports at all sizes; single-colour version exists". All present, no regressions across revisions:

- Primary (`svgPrimary`) + mono (`svgMono`) logos as inline SVG masters with solid fills, ≥8px min stroke, construction grid (256 grid, 14px tag stroke, 12px viewfinder strokes, 19px dot + 7px ring, 34px clipped corner, clearspace = hole diameter).
- 48px/32px small-size cuts with +12% bumped stroke weights; 2cm fair-badge sticker test (circle + square + stall ticket); sunlight 40%-wash toggle simulation (target: mark readable with wash; orange dot never the sole carrier of meaning).
- iOS 1024 no-alpha full-bleed Ink + PWA 512/192 + touch 180 + small 48 PNGs; Android adaptive foreground (verified genuinely transparent — the rect in the kit preview is preview-only) + flat `#16150F` background; `capacitor.zip` bundle (9 icons + README; regenerate/verify via `npx capacitor-assets generate --iconBackgroundColor "#16150F" --splashBackgroundColor "#16150F"` before ship).
- Avatar 512 master / 98 display / 48 small + 32px dot-only fallback; splash dark (Ink, demo default) + light (Paper) 2732 masters, logo-only flat fills, geometry matched to iOS icon, no baked-in wordmark (Capacitor centres the image).
- Wordmark lockup (horizontal default, stacked reversed for fair banner, single-line mono for 1-colour thermal swing ticket) + Kraft-ticket precedent photo. **Gap (advisory only):** no standalone `snaplog-lockup.*` export — lockups are inline-only in the kit page. Export one SVG from the kit page or defer; splash/icon/avatar already cover the demo.
- Colour/type rules: Ink `#16150F` / Paper `#FAFAF7` (15.8:1) / Stall Orange `#E34A0B` (accent only, never body text; Stall Orange buttons use Ink text for sunlight legibility) / Kraft `#E8D5AC` (tickets only) / Stall Grey `#6B675C` (muted). Display Georgia/Times serif; body system stack with IBM Plex Mono (bundled Fontsource) for labels/numbers/prices only. No gradients. Focus ring 3px Stall Orange. Touch targets ≥44px.

---

## 4. Stream B — social + sting: PASS

Acceptance was "covers + templates + bumper, editable sources included". All present as editable SVG-in-HTML with download buttons — no flattened files:

- Facebook Page cover 851×315 (Meta upload spec, mobile-safe 640 centre guide) + LinkedIn Page cover 1512×256 (official Page spec, text-safe zone). SVG download + exact-pixel PNG export in-page.
- Instagram 1080×1080 grid post + 1080×1920 story announcing the hackathon build ("We turned trade-fair chaos into a searchable catalogue — built with Meta's AI stack"), story copy in safe zones (top-250/bottom-340 noted), alt text included.
- 3.0s CSS logo sting at 1920×1080 with timeline ruler + record instructions for the demo-video opener (SUB-02).
- **Outstanding work is operational, not a gate failure:** run in-page SVG→PNG export and screen-record the sting at 1080p/3.0s before SUB-02 needs them. Keep the HTML files as source of truth.

---

## 5. Stream C — app redesign: CONDITIONAL PASS

Implementability gate: "every screen maps to shadcn primitives + Tailwind tokens (no bespoke component); colour/type/spacing emitted as tokens, not pictures". **Holds.**

### 5.1 Tokens — YES, complete as v4 `@theme`

Paste-ready block in `snaplog-app-redesign.html:90-111` (single source of truth for React + Vite + Tailwind v4 + shadcn new-york; paste into `app.css` after `@import "tailwindcss"`):

```css
@import "tailwindcss";
/* npm i @fontsource/ibm-plex-mono + @font-face via @fontsource (bundled) */
@theme {
  --color-ink: #16150F; --color-paper: #FAFAF7;
  --color-accent: #E34A0B; --color-kraft: #E8D5AC;
  --color-mist: #E0E5E8; --color-slate: #6B675C;
  --color-danger: #B42318; --color-danger-bg: #FDE8E8;
  --color-field-warn: #FFF7ED;
  --font-display: Georgia, 'Times New Roman', serif;
  --font-body: ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
  --radius-app: 14px; --radius-pill: 999px;
}
/* Alert destructive → bg-danger-bg/border-danger.
   Low-confidence field → border-danger/bg-field-warn. */
```

Also: borders 2–3px ink, 3px accent focus-visible, 44–48px minimum targets (44/52/56/64/68/72 in prototype), Ink/Paper 15.8:1, Ink-on-Orange primaries, solid inks only. Head CDN shim (`:10`) still uses legacy `theme:{extend:}` — CDN-shim only, ignore; the `@theme` block is normative. `DESIGN-HANDOFF.md:44` still says "extend block" — stale, fix to "`@theme` paste-block" (N2).

### 5.2 shadcn map — CLEAN, no bespoke components

`snaplog-app-redesign.html:117-121`: Capture → Button, Sheet, Badge, ToggleGroup, Alert; Review → Card, Input, Badge, Alert, Separator; Catalogue → Input, Card, Badge, Skeleton, Tabs, Alert; Vendor → Avatar, Card, Button, Separator; Jobs → Progress, Card, Alert, Button, Badge. All registry primitives. Review correctly dropped `Select`/`Dialog` in the revision (correct for fixed-vendor — no assign-or-create). Repo `src/components/ui/` currently ships ~half; the rest are `shadcn add`-able (~1h). `SchemaReviewForm.tsx:170` uses native `<select>` for schema enum fields only — not a shadcn-Select gap.

### 5.3 Screens × states — COMPLETE (5 × 5 + sane 6th Jobs-only `unconfig`)

- Capture (`:186-204`): default/loading ("Opening camera…")/empty ("No shots yet")/error ("Camera blocked" + Retry)/lowconf ("DIM LIGHT · MOVE CLOSER" banner). Thumb-zone: primaries in bottom 240px; 64px `◉ CAPTURE` pill; 68px mode buttons.
- Review (`:208-239`): default/loading ("Saving style…")/empty ("Nothing extracted" + Retake)/error ("Save failed — offline?" + Retry)/lowconf (count banner + per-field "NEEDS CHECK" + `border-danger`/`bg-field-warn`). Original Info image above fields (`:233`) with `✦ Info` + `Primary` chips.
- Catalogue (`:242-257`): loading skeletons/error + Retry/empty ("No matches for …" / "Catalogue is empty" + Capture CTA)/lowconf ("N NEED REVIEW" banner); live text search (`aria-label="Text search catalogue"`, FR-CAT-02 text-only — no visual-search entry, FR-CAT-03 cut respected) + All/Fabric/Garment filter tabs; style cards with fabric-chip + `REVIEW ⚠` badge on low-conf items.
- Vendor (`:260-273`): loading/error/empty ("No styles yet" + pre-filled Capture CTA)/lowconf ("Unverified booth"); vendor header (avatar disc, booth, style count), View-styles CTA, Edit/QR (see B3), style grid.
- Jobs (`:277-288`): loading/error ("Job failed at 68%" + Retry/Dismiss — Dismiss is a B3 stub)/empty/lowconf-with-warnings + default progress (progressbar with `aria-valuenow`, checklist, Cancel) + queued card + **`unconfig` (`:141,280`)**: `EXPORT PIPELINE · UNCONFIGURED` + reason line ("no export target connected — ask the fair organiser…") + `disabled`+`aria-disabled` Export button + "Queued jobs are kept…" note. Gate (`:298-301`) correctly notes "Unconfigured is a Jobs state — showing this screen's default" elsewhere. Port the `unconfig` variant verbatim (fixes old B4).
- Chrome: 4 tabs + central 72px `+` (`:158-169`); `pressPlus` (`:147-149`) carries vendor context and toasts "Locked through save"; `+` from search routes into catalogue text search with focus. Back behaviour, toasts, cancel-confirm, and polling cleanup (`:313-314`) all present.

### 5.4 Fabric/garment switch — OBVIOUS and now functional

Full-width 2-up `◧ FABRIC / ⛁ GARMENT`, 68px targets, 18px black caps + ✓ indicator (`:180-183`), demo-scripted. Mode switch now re-renders review fields via `SCHEMAS[S.mode]` (`:227,235`) — 720p-legible and honest.

### 5.5 Schema-driven review — FIXED in prototype, generalisation debt remains

`snaplog-app-redesign.html:212-236`: `SCHEMAS` fabric v3 (name/fabric/weave/color/price) + garment v3 (name/gtype/sizes/color/wholesale-price/comp) rendered via `sch.fields.map(field)` with per-field confidence badges, low-conf `NEEDS CHECK` + `border-danger`/`bg-field-warn`, schema-vs-line (`:236` "never hardcoded") and vsn line. **Prototype proves switching, not `FR-SCH-03`.** Builder must bind the renderer to the live schema registry and record `schemaVersion` on save (N3) — the two literals must not ship as a second schema source.

### 5.6 Vendor flow — FIXED, matches vendor-locked decision (§6)

Capture shows a locked `VENDOR · name · booth` banner (`aria-label="Vendor context"`, `:189`) — no clear-chip, no picker. Review shows "Saving as X · vendor display only — populated server-side, not submitted" (`:234`) + schema-vs line. Save gates on style name only (`:238,309`) — correct under fixed-vendor (vendor comes from the route, server-side). No assign/create, no Unassigned inbox, no vendor `<select>`. D80-12 demo item now belongs to Fashion Textile (old Unassigned gone).

### 5.7 Narrative-neutral, scope, demo-legibility — ALL PASS

No accounts/billing/ordering/extra categories anywhere (`:73` scoped statement holds). No vendor-optional UI. No visual-search entry. Original capture stays visible above extracted fields (review `:233`, cards `:251`, capture filmstrip `:202`). All targets ≥44px. Ink-on-Orange primaries + 15.8:1 Ink/Paper hold for sunlight; bottom-nav active state (12px mono orange-on-ink, ~4.5:1) is the thinnest — verify on-device at 720p and add weight/size if it shimmers.

---

## 6. Vendor-locked-at-capture proposal — ADOPTED

Owner prompt (supersedes the brief's "elsewhere → vendor picker first"): vendor is pre-selected before capture opens, so the capture screen is already pre-filled. Today no capture is reachable except through a vendor page — all captures are against a vendor. Remove any vendor picker from capture; assume the route vendor carries through to save. At most a display-only vendor line on review (not a submitted form field) — even that optional; trust server-side population.

### 6.1 Routing reality — proposal is sound (PASS)

Covered in §2.3. There is no vendor picker to remove and no vendor-less capture route to support. Adopting the proposal deletes work (no picker to build) rather than adding it.

### 6.2 Display-only vs nothing — keep display-only

One `<p>`/banner on capture (already `:189`) + one line on review (already `:234`). Never a `<select>`/`<input>`, never submitted. Rationale: wrong-stall saves in a noisy one-handed fair with zero visual confirmation = silent misfile; the line costs nothing and wins demo-legibility (judge sees the vendor on camera). Owner's "even that is a push" is noted — if the line must go, keep at minimum the capture banner so the buyer knows which stall they are saving to.

### 6.3 N1 closed

Prior re-review BLOCK N1 (vendor picker missing) is closed as **dropped by owner decision, superseded by vendor-locked-at-capture**. No picker UI to build on capture entry.

### 6.4 R-01 stays deferred

Trusting route `vendorId` + server enforcement (scan-session/commit match-check) is not late binding. No assign-or-create, no Unassigned inbox, no vendor-optional UI. Keep `docs/roadmap/README.md:R-01` deferred intact.

### 6.5 Exact doc line to change

`docs/plans/DESIGN-01-opendesign-brief.md:26` Keep-clause, replace:

> elsewhere → vendor picker first

with:

> elsewhere → must first enter a vendor page (no vendor-less capture; R-01 deferred). Vendor is FIXED before capture (route `vendorId`) and DISPLAY-ONLY at review (`<p>`/banner, never submitted); add missing-`vendorId` guard (redirect to vendor list / `ErrorState`).

### 6.6 Guard G1 (the only new build BLOCK, ~1 line)

`src/app/catalogueRouteWrappers.tsx:8,25` + `CatalogueItemCaptureFlow.tsx:23-29` accept empty `vendorId`. Add: if `!eventId || !vendorId`, redirect to `/events/:eventId/vendors` (replace) or render `ErrorState` + Back. Never start a capture session or extraction with an empty id.

---

## 7. Prior findings resolution

### 7.1 BLOCKs B1–B4

| ID | Before | Now |
|---|---|---|
| B1 hardcoded fabric-only review | BLOCK | **FIXED in prototype** — `SCHEMAS` fabric/garment v3 + `sch.fields.map`. Builder debt: bind to live registry + stamp `schemaVersion` (N3) |
| B2 `window.prompt()` vendor-create | BLOCK | **FIXED** — zero `prompt()`/`data-newv`/Unassigned hits |
| B3 stubbed toast buttons | BLOCK | **REMAINS** — `data-t` stubs on Vendor Edit-details/QR-code (`:270`), Jobs Review-stills/Export-anyway (`:281`), error-job Dismiss (`:279`), all wired to `toast('Demo build — stubbed.')` (`:305`). Fix: wire each to a real action/route or delete; never ship toast-stub buttons |
| B4 no unconfigured-pipeline Jobs variant | BLOCK | **FIXED in prototype** — `unconfig` variant (`:280`) + sane gating (`:298-301`). Port verbatim |

### 7.2 Advisories A1–A12

- **A1 danger trio missing → RESOLVED.** `danger #B42318 / danger-bg #FDE8E8 / field-warn #FFF7ED` now in CDN shim (`:12`), `:root` (`:18`), and `@theme` (`:102-103`). Use `#FFF7ED` everywhere (prototype changed from `#FFF7F7` — intentional amber tint, adopt it).
- **A2 v3-extend vs v4-`@theme` → PARTIALLY RESOLVED.** In-page `@theme` (`:90-111`) is normative; head shim still `extend` (ignore — CDN only); handoff `:44` still says "extend block" (fix to "`@theme` paste-block", N2).
- **A3 body-font contradiction → RESOLVED in spec.** Body system stack, Plex Mono via bundled `@fontsource/ibm-plex-mono` (never a network link), Georgia/Times display. Implement with `npm i @fontsource/ibm-plex-mono` + bundled `@font-face` (no Google-Fonts `<link>`).
- **A4–A12 → ALL PASS in prototype** except the B3 carryover: thumb-zone primaries, 5×5 states (+ sane `unconfig`), original-beside-fields, contrast/targets, shadcn map, narrative-neutral, switch legibility. Remaining polish notes carried into §9 (explicit `for`/`id` label association, vendor-banner target size already fixed by locked banner, save `disabled`+`aria-disabled` handling, shadow/motion tokens — adopt Tailwind defaults explicitly, dark-mode = light-only for the demo, breakpoints 360/390/430 with the 9-viewport matrix parked).

---

## 8. `DESIGN_SYSTEM.md` sufficiency — SUFFICIENT WITH DECISIONS

**Copy verbatim:** the `@theme` block (§5.1), font install line, shadcn primitive-per-screen map (§5.2), state matrix incl. `unconfig`, bottom-nav + context-aware `+` rule, mode-switch markup, Jobs `unconfig` markup, fixed-vendor copy ("vendor display only — populated server-side, not submitted"), save-gate rule (name-required under fixed-vendor), demo-legibility bar (720p, sunlight, ≥44px).

**Must decide (do not copy blindly):**

1. Live-schema binding (N3) — prototype literals prove switching only; `FR-SCH-03` registry + `schemaVersion` stamping is builder work in task ⑨.
2. Missing-vendor guard (G1) — one-line redirect/`ErrorState`; not in the prototype.
3. B3 stubs — real actions or deletion; not a design choice.
4. `field-warn` migration to `#FFF7ED` throughout; `globals.css` reskin (current file still carries pre-Snaplog orange/dark tokens — replace with §5.1 block); dark-mode = light-only for the demo; breakpoints 360/390/430 (park the 9-viewport matrix).

---

## 9. Tuesday AM feasibility — RESKIN FIRST, THEN STREAM C

- **Tokens-only reskin fallback: ~1–2h, LOW risk, unblocked.** Paste `@theme`, add Fontsource, swap Capacitor icon/splash (verify `capacitor.zip` contents or regenerate), header logo, button radii, danger usages. Zero backend dependency; landable Monday.
- **Full Stream C: ~1 day builder, TIGHT but feasible.** B1/B2/B4 done in prototype but must be generalised to real schemas (critical path: schema-driven review binding, ~5–8h); G1 guard + B3 stub closures are small; N2 is a doc line. Add ~3h for 25-state QA + 720p camera check.
- **Top risks:** (1) N3 generalisation is real work, not copy-paste; (2) B3/G1 forgotten in a rush; (3) font/v4-token translation silently regressing legibility; (4) Jobs polling needs the backend contract — if the Modal endpoint is not ready, ship the `unconfig`/disabled state deliberately.
- **Cut order (brief A→B→C + Fallback):** land A (icon/splash swap, zero code risk) → tokens reskin → task-⑨ review UI in the current layout (highest PRD value) → remaining Stream C screens → Jobs polish last. Social uploads + sting recording run in parallel off the critical path.

---

## 10. Builder action checklist (ordered)

1. [ ] Paste `@theme` block (§5.1) into `app.css`; `npm i @fontsource/ibm-plex-mono` (bundled import, no network link); replace `globals.css` pre-Snaplog tokens.
2. [ ] Swap Capacitor icon/splash (verify `capacitor.zip` or regenerate with `npx capacitor-assets generate --iconBackgroundColor "#16150F" --splashBackgroundColor "#16150F"`).
3. [ ] Add G1 missing-`vendorId` guard in `catalogueRouteWrappers.tsx` (redirect or `ErrorState`).
4. [ ] Bind review renderer to the live schema registry (`FR-SCH-03`); stamp `schemaVersion` on save (N3). Delete the two prototype literals — never ship them as a second schema source.
5. [ ] Close B3: wire or delete Vendor Edit-details/QR-code, Jobs Review-stills/Export-anyway, error-job Dismiss stubs. Ship zero toast-stub buttons.
6. [ ] Port Jobs `unconfig` variant verbatim (disabled Export + reason + queued-kept note).
7. [ ] Keep capture vendor banner + review display-only vendor line (`<p>`/banner only, never submitted); save gates on style name under fixed-vendor.
8. [ ] Fix N2 doc line + brief Keep-clause wording (§6.5) when touching those files.
9. [ ] 25-state QA + on-device 720p camera check (sunlight contrast, bottom-nav orange-on-ink active state, 44px targets).
10. [ ] Export social PNGs (in-page SVG→PNG) + record the 3.0s sting at 1080p before SUB-02 needs them.

---

## Appendix — evidence pointers

- Brief: `docs/plans/DESIGN-01-opendesign-brief.md:26,28,30,39-43`
- Handoff: `docs/brand/DESIGN-HANDOFF.md:19-22,24-27,29-34,36-44` (note `:44` staleness)
- Tokens/map: `docs/brand/snaplog-app-redesign.html:9-14,18,90-123`
- Vendor-locked: `snaplog-app-redesign.html:142,147-149,189,234-238,308-309`
- Schema-driven: `snaplog-app-redesign.html:212-236`
- Jobs unconfig: `snaplog-app-redesign.html:141,280,298-301`
- Remaining stubs: `snaplog-app-redesign.html:270,279,281,305`
- Routing reality: `src/app/App.tsx:313,323`, `src/app/catalogueRouteWrappers.tsx:8,25`, `src/features/catalogue/hooks/useCatalogueItemCaptureFlow.ts:70-76,187-203,273-278`, `src/features/catalogue/screens/CatalogueItemCaptureFlow.tsx:23-29,87-100,120`, `src/features/catalogue/screens/CatalogueItemReviewScreen.tsx:126-132`, `src/features/catalogue/components/CatalogueTypePicker.tsx:23-26,39-44`


Now, the sting + social producer discussion
My proposal, for you to react to:
- Sting recording — you, Monday evening. You're already at the machine with the browser session; it's a screen-record + trim to exactly 3.0s, and the page has its own ruler + instructions. Builder verifies duration/resolution Tuesday morning (5 minutes, mechanical).
- Social PNGs — builder, Monday. Pure in-page export clicks + pixel verification; no judgment required, no reason to spend your evening on it.
- Slot: both landed by Mon EOD, because SUB-02 recording starts Tue and the video opener can't be edited around a missing sting.
The one question back to you: do you have screen-recording + a media probe (or trim tool) available Monday evening, or should the builder own the whole chain and hand you finished files to approve?