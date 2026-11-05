# DESIGN-02A — Brand asset integration (Stream A)

**Branch:** `task/design-rework` ONLY (rule below) · **Priority:** P0 · **Effort:** ~1h
**Satisfies:** DESIGN-01 Stream A; SUB-02 app identity.
**Status vs staging (Mon Nov 2):** NOT DONE. Assets exist in `docs/brand/`; staging still has pre-brand platform icons, `index.html` has no favicon, and no logo renders anywhere in `src` (`AppHeader` is title-only — verified by grep).

**Decision:** platform identity only — icons, splash, favicon. No in-app logo placement in this plan (no logo exists to swap; adding one is DES-02C2a chrome, not an asset swap). Zero behaviour change.

## Files

- Verify first: `docs/brand/capacitor.zip` (unzip: 1024 no-alpha icon, Android adaptive fg/bg, README per `DESIGN-HANDOFF.md:24-27`). Missing anything → regenerate from SVG masters: `npx capacitor-assets generate --iconBackgroundColor "#16150F" --splashBackgroundColor "#16150F"`.
- Masters: `snaplog-icon-1024.svg/png`, `snaplog-icon-fg/bg.*`, `snaplog-splash-dark/light-2732.*`, `snaplog-avatar.*`.
- Replace generated sets in `ios/App/App/Assets.xcassets/` (AppIcon + Splash) and Android `res/` mipmaps/adaptive pair; keep old sets recoverable in the commit history, don't delete sources.
- Web: copy `snaplog-icon-192.png` → `public/favicon.png`, add `<link rel="icon">` in `index.html` (currently none).
- Do NOT touch colours, screens, or `src/components/ui/app-header.tsx`.

## Branch rule (all DESIGN-02)

All design work commits to `task/design-rework` ONLY. **Never merge to `staging` until the owner explicitly replies "merge design-rework".** No partial merges.

## Acceptance

Capacitor build + `pnpm dev` boot with new icon/splash; favicon loads; screenshot-diff vs pre-plan shows zero layout change; `pnpm lint && pnpm check && pnpm test:run` green.

## Risks

- Wrong shipped-icon path per platform — verify Contents.json/adaptive XML before replacing.
