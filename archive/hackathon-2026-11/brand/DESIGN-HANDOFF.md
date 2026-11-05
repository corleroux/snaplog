# Snaplog Trade-Fair Brand Kit — implementation handoff

This archive is the source of truth for turning the design into production code. Start from `snaplog-brand-kit.html`, then preserve the visual system, responsive behavior, and interactions found in the exported files.

## Implementation target
- Build production UI from the exported design, not a loose reinterpretation.
- Preserve typography scale, spacing rhythm, color tokens, border radii, shadows, motion timing, and component states.
- Replace static placeholders only when the target app has real data or functional equivalents.
- Keep generated product UI free of OpenDesign chrome, preview labels, or design-process annotations.
- Treat this handoff as a visual contract: if implementation choices conflict, match the exported pixels and behavior first, then refactor internals.

## Source map
- Primary entry: `snaplog-brand-kit.html`
- HTML screens detected: 5 (brand kit, social covers, social templates, logo sting, app redesign)
- Stylesheets detected: 0
- Script/component files detected: 0
- Supporting assets detected: 35 (4 context photos, 10 app icons, 4 avatar files, 4 splash masters, 3 Stream B pages, 1 app prototype, 9 reference screenshots, 1 capacitor bundle)

## Brand tokens (Snaplog)
- Ink #16150F (foreground, borders, icon background) / Paper #FAFAF7 (background) / Stall Orange #E34A0B (accent only, never body text)
- Stall Orange buttons must use Ink text, not white, for sunlight legibility.
- Display: Times / Georgia serif; Body: system stack; IBM Plex Mono (bundled Fontsource) for labels/numbers/prices only. Solid inks only — no gradients. (Normative rule: `DESIGN_SYSTEM.md`.)

## App icons (Capacitor)
- iOS / store: `snaplog-icon-1024.png` (1024x1024, no alpha, full-bleed Ink). PWA: 512 / 192. Touch: 180. Small: 48.
- Android adaptive: `snaplog-icon-fg-432.png` + `snaplog-icon-fg.svg` (transparent foreground artwork), `snaplog-icon-bg-432.png` + `snaplog-icon-bg.svg` (flat #16150F).
- Pre-bundled: `capacitor.zip` (9 icons + README). Generate mipmaps/splash with `npx capacitor-assets generate --iconBackgroundColor "#16150F" --splashBackgroundColor "#16150F"`.

## Avatar
- Master `snaplog-avatar.svg` (256 canvas, Ink disc + Paper tag + Stall Orange dot).
- Exports: `snaplog-avatar-98.png` (social master), `snaplog-avatar-512.png` (high-res), `snaplog-avatar-48.png` (small). 32px fallback is dot-only (see kit section 05).

## Splash screens
- Masters `snaplog-splash-dark-2732.svg/png` (Ink field, demo default) and `snaplog-splash-light-2732.svg/png` (Paper field), 2732x2732 logo-only flat fills. Geometry matches the iOS icon; no baked-in wordmark because Capacitor centres the image.

## Stream B — social kit (editable sources)
- `snaplog-social-covers.html`: Facebook Page cover 851x315 (Meta upload spec, mobile-safe 640 centre guide) + LinkedIn Page cover 1512x256 (official Page spec, text-safe zone). SVG download + exact-pixel PNG export.
- `snaplog-social-templates.html`: Instagram 1080x1080 grid post + 1080x1920 story announcing the hackathon build ("We turned trade-fair chaos into a searchable catalogue — built with Meta's AI stack"). Story copy stays in the safe zone; alt text included.
- `snaplog-logo-sting.html`: 3.0s CSS logo sting at 1920x1080 for the demo-video opener. Replay in-browser, screen-record at 1080p, trim to 3.0s.

## Stream C — App redesign (working prototype)
- `snaplog-app-redesign.html`: 390px mobile-first prototype — capture (thumb-zone, fabric/garment switch), schema review (confidence flags, display-only vendor line — vendor pre-selected before capture, never a form field), catalogue (live text search, type filter), vendor page (pre-filled capture entry), video jobs (progress, queue, retry). Every screen ships loading / empty / error / low-confidence variants via the state switcher.
- Reference inputs (current app, do not ship as-is): `catalogue-list.png`, `capture-page-1.png`, `capture-page-1-image-attached.png`, `capture-image-page2-extacting-process.png`, `capture-image-page3-review.png`, `capture-image-page3-review2.png`, `capture-image-page3-review3.png`, `vendor-list-page.png`, `vendor-page.png`.
- Tokens emitted as a Tailwind v4 `@theme` paste-block (the `@theme` block is normative; any `extend` shim is CDN-only); screen→shadcn-primitive map in-page. No bespoke components.

## Responsive contract
Validate the implementation across this 2025–2026 viewport matrix:
- Mobile compact: 360x800
- Mobile standard: 390x844
- Mobile large: 430x932
- Foldable / small tablet: 600x960
- Tablet portrait: 820x1180
- Tablet landscape: 1024x768
- Laptop: 1366x768
- Desktop: 1440x900
- Wide desktop: 1920x1080

For responsive web exports, treat these as a modern breakpoint system for one adaptive web experience, not three fixed screenshots. Preserve any CSS media queries, container queries, fluid `clamp()` scales, and layout changes already present in the exported files.

## Assets and supporting files
- `snaplog-brand-kit.html`
- `snaplog-social-covers.html` / `snaplog-social-templates.html` / `snaplog-logo-sting.html`
- `capture-1774937937370-8b0db4b3-7807-4a52-bb43-def276b598ca.webp`
- `garment-04-jean-jacket.jpg`
- `garment-07-gown.jpg`
- `garment-10-denim-80s.jpg`
- `snaplog-icon-1024.svg` / `snaplog-icon-fg.svg` / `snaplog-icon-bg.svg`
- `snaplog-icon-1024.png` / `snaplog-icon-512.png` / `snaplog-icon-192.png` / `snaplog-icon-180.png` / `snaplog-icon-48.png`
- `snaplog-icon-fg-432.png` / `snaplog-icon-bg-432.png`
- `snaplog-avatar.svg` / `snaplog-avatar-98.png` / `snaplog-avatar-48.png` / `snaplog-avatar-512.png`
- `snaplog-splash-dark-2732.svg` / `snaplog-splash-dark-2732.png` / `snaplog-splash-light-2732.svg` / `snaplog-splash-light-2732.png`
- `snaplog-app-redesign.html`
- Reference screenshots: `catalogue-list.png`, `capture-page-1.png`, `capture-page-1-image-attached.png`, `capture-image-page2-extacting-process.png`, `capture-image-page3-review.png`, `capture-image-page3-review2.png`, `capture-image-page3-review3.png`, `vendor-list-page.png`, `vendor-page.png`
- `capacitor.zip`

## Coding checklist for AI tools
1. Inspect `snaplog-brand-kit.html` and `DESIGN-MANIFEST.json` first and identify reusable components before coding.
2. Implement each user-facing screen file as its own route/surface; keep launcher, landing, app, platform, and OS widget files separate.
3. Extract design tokens into the target stack: colors, type scale, spacing, radius, shadows, and motion.
4. Implement layout with real 2025–2026 responsive breakpoints, fluid type/spacing, and container-query-aware component behavior; test with no horizontal overflow.
5. Preserve interactive controls, hover/focus/pressed states, form behavior, validation, and copy actions where present.
6. Implement domain-specific in-app modules with real states; do not flatten them into generic cards.
7. Keep landing page, product screens, and OS widget/quick-access surfaces separate when present.
8. Confirm the production result visually matches the exported design before refactoring internals.
9. Reject implementation shortcuts that flatten the design into generic cards, generic gradients, placeholder stats, or framework-default typography.
10. If a detail is ambiguous, keep the exported HTML/CSS/JS behavior rather than inventing a new pattern.
