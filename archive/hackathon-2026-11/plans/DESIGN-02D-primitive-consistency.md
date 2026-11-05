# DESIGN-02D — Primitive consistency pass (post-merge fix)

**Branch:** `task/design-02d-primitive-consistency` off `staging` · **Priority:** P0 demo-polish (owner-flagged, on staging now) · **Effort:** ~2–3h
**Satisfies:** DESIGN-01 implementability gate (primitive half); no PRD FR — say so and stop rule noted: visual-consistency fix only, no new requirement.
**Depends on:** DESIGN-02 wave merged on staging (C1 tokens + C2 screens). Owner pre-approved end-to-end incl. merge + SUB-01 sync.

**Decision:** fix the semantic-token collision, not every call site. Root cause is verified (builder diagnosis, don't re-derive): shadcn semantic `--accent` (expects subtle hover tint) is mapped to brand Stall `#E34A0B` (solid), so every `hover:bg-accent` (18 files) renders solid orange; Vendor-info pairs it with `hover:text-primary` (also Stall) = orange-on-orange.

## Files (in implementable order)

1. **Semantic split — `src/styles/globals.css` + `src/components/ui/button.tsx` (+ badge if same pattern):** `--accent` → subtle Stall tint (e.g. Stall at ~8–10% over Paper) with `--accent-foreground` = Ink; brand Stall stays live ONLY via `--primary`/`--ring` (solid). Pick ONE: retokenise `--accent*` (preferred, one-line fix propagates to all 18 `hover:bg-accent` sites, incl. outline variant, modal, toast). Leave `.dark` untouched (light-only demo). Verify first: grep all `hover:bg-accent` + `hover:text-primary` pairings — fix/audit each so no accent-bg meets primary/stall text.
2. **Vendor-info hover — `StyleListScreen.tsx:235-244`:** change `hover:text-primary` → `hover:text-foreground` (matches Export :247-257, which hovers fine). No handler/route change.
3. **Type discipline — `globals.css:166-178`, `PageHeader.tsx:143`, `BottomNavigation.tsx:211,264`, `StyleCard`:** explicit serif rule — `font-display` (Georgia) on intended headings/titles only (incl. StyleCard `<h3>` parity with other card titles, which become `font-display` spans, not raw `<h*>`); mono whitelist — KEEP SKU/prices/counts/labels where correct, REMOVE `font-mono` from PageHeader subtitle (company name → sans) and bottom-nav labels (→ sans, sentence case, ~11–12px). Nav labels stop being mono/uppercase.
4. **Primitive normalisation (visual only, behaviour frozen):** raw `<button>` → shared `Button` (ghost/outline now fixed by step 1) and chips → `Badge` on touched screens (Styles list, Vendor list, Events first; opportunistic elsewhere — 44-file full sweep is out of scope); `EntityCard` hardcoded `bg-white/text-gray-900/bg-gray-100/chip gray` → design tokens (PR #38 finding 2, deferred until now); `PageHeader` raw-button `hover:bg-muted` states → ghost parity; `BottomNavigation`: bespoke buttons stay (tab-bar pattern) but labels/strokes normalised — single stroke width (2), active = Ink + Stall indicator, inactive = muted-ink; feedback control → ≥44px tap target with Ink-on-Paper contrast (integrate into bar or enlarge in place — no new components, no route/handler change).

## NON-goals

No layout redesign, no new screens/components beyond existing primitives, no behaviour/handler/route/test-string changes (suite must pass with **zero test changes** — if impossible, the forcing site is a behaviour change: stop and escalate, don't edit the test). No dark-mode work.

## Acceptance

`pnpm lint && pnpm check && pnpm test:run && pnpm build` green, zero test changes (C2 rule); reviewer + design-reviewer pass; 720p screenshots: Styles + Vendor list + Events, Vendor-info hover (Ink text on tint, readable) vs Export hover, bottom-nav active/inactive + feedback target.
