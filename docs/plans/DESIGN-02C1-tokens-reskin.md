# DESIGN-02C1 — Tokens reskin (Stream C fallback deliverable)

**Branch:** `task/design-rework` (never merge without owner sign-off — rule in DES-02A) · **Priority:** P0 (this IS the Tue 12:00 fallback UI) · **Effort:** ~1–2h
**Satisfies:** DESIGN-01 implementability gate (tokens half); demo-legibility floor.
**Depends on:** Stream A assets in place on the same branch (DES-02A).

**Decision:** tokens only — colours, type, radius, focus ring. No layout, no screen restructuring, no behaviour change. If the Tue 12:00 trigger fires, this + current layout is the submission UI.

## Files

- Paste the normative `@theme` block (review §5.1, `snaplog-app-redesign.html:90-111`) into the Tailwind v4 entry stylesheet — confirm which file carries `@import "tailwindcss"` (expected `src/styles/globals.css`); replace the pre-Snaplog orange/dark tokens there, don't append beside them. Ignore the prototype's legacy v3 `extend` head shim (CDN-only).
- `npm i @fontsource/ibm-plex-mono` with bundled `@font-face` import — never a Google-Fonts `<link>` (fails silently offline in Capacitor).
- Apply button radii + danger usages (`bg-danger-bg`/`border-danger` alerts, `bg-field-warn` low-confidence fields — use `#FFF7ED` everywhere per review A1).
- Header logo swap rides along if not already done in DES-02A.

## Acceptance

Tokens render (spot-check: Ink/Paper surfaces, Stall Orange primaries with Ink text, danger + field-warn states, Plex Mono numerals); `pnpm lint && pnpm check && pnpm test:run` green; **existing e2e suite green with zero test changes** (proves no behavioural diff); 720p screenshot check for sunlight contrast + bottom-nav active state.

## Risks / verify first

- Silent legibility regression is the failure mode (wrong token file, font not bundled). The 720p check is mandatory, not optional.
- This plan must be DONE (not started) by Tue 12:00 — it is the fallback. Land it first, before DES-02C2.
