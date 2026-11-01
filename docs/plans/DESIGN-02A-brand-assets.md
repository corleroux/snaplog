# DESIGN-02A — Brand asset integration (Stream A)

**Branch:** `task/design-rework` (SHARED design branch — see rule below) · **Priority:** P0 (needed by SUB-02 + app identity) · **Effort:** ~1h
**Satisfies:** DESIGN-01 Stream A acceptance; SUB-02 (logo in video, app identity).
**Depends on:** design-reviewer PASS for Stream A (have it).

**Decision:** asset swap only — zero code-risk, zero behaviour change. No component, route, or style logic is touched in this plan.

## Files

- `docs/brand/` sources (already in repo): `snaplog-icon-*.svg/png`, `snaplog-avatar.*`, `snaplog-splash-dark/light-2732.*`, `capacitor.zip`.
- Verify `capacitor.zip` first (A8): unzip, confirm no-alpha 1024 icon + Android adaptive fg/bg pair + README. If anything is missing, regenerate: `npx capacitor-assets generate --iconBackgroundColor "#16150F" --splashBackgroundColor "#16150F"` from the SVG masters.
- Place platform icons/splash per Capacitor dirs; update the header/app-frame logo to the new lockup SVG (`src/components/ui/app-header.tsx` and anywhere else the old mark renders — grep for it); favicon + PWA manifest icons.
- Do NOT touch colours, spacing, or any screen in this plan (that's DES-02C1).

## Branch rule (applies to ALL design plans)

All work commits to `task/design-rework` ONLY. **Never merge to `staging` until the owner explicitly signs off** (owner replies "merge design-rework"; builder merges via PR). No exceptions, no partial merges.

## Acceptance

Fresh `pnpm dev` + Capacitor build boots with new icon/splash/logo; `pnpm lint && pnpm check && pnpm test:run` green; screenshot-diff of every screen against pre-plan state shows zero layout/behaviour change (assets only).

## Risks / verify first

- Confirm which file is the shipped icon on each platform before replacing (don't orphan the old asset path).
- Keep old assets recoverable until sign-off (commit, don't overwrite blindly).
