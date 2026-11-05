# DEMO-01 — Demo video production (Hyperframes assembly, real footage only)

**Branch:** `task/demo-video-production` off `staging` (production scaffolding + Playwright demo spec; footage renders stay OUT of git — see below) · **Priority:** P0 (submission artifact) · **Effort:** ~6–8h build team + owner VO tonight
**Satisfies:** SUB-02 demo video (25% Demo + 30% Impact rubric lines); event 3-minute unlisted-video rule.
**Depends on:** SUB-02 demo script (locked + architect-reviewed); DES-02B exports verified (pixels/duration); benchmark numbers on images; owner VO; rack-walk clip (placeholder until it lands).

**Decision: Hyperframes assembles and packages; it never invents.** Every second of app on screen is genuine screen footage of the working product. Route: `/general-video` with real footage (not product-launch-video — input is footage, not a URL; the brief confirms the route). Composition is deliberately boring — cuts, captions, lower-thirds, sting — the product is the star and simple renders fast on deadline day.

## Footage inventory (all real, no mockups)

1. **Playwright scripted flows** — new `e2e/demo/` spec (SEPARATE config, `video: 'on'`, Pixel 5 project, deterministic seed data) run against the **local stack** with real `MODEL_API_KEY` (Standard mode): fabric tag extract + garment capture→extract→review→commit. Zero shared-project writes. Do not touch the CI e2e config. **Auth: primary = `createTestUser()` from `e2e/helpers/auth-helpers.ts` seeding `E2E_USER_EMAIL` on the local stack (no owner creds needed); failover = login details in gitignored `secrets/secrets.md`, consumed ONLY via `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` env vars — never printed, logged, committed, or pointed at the shared remote project (remote recording needs explicit owner go + marked demo records + cleanup). Follows the existing `login()` helper convention.
2. **Manual phone footage** — hook B-roll + any in-hand shots; rack-walk clip when it lands this afternoon.
3. **Sting + benchmark beat** — `docs/brand/exports/snaplog-logo-sting-1920x1080.mp4` (opener), benchmark table from the runner output (numbers only).
4. **Rack-walk segment = timed placeholder NOW** (title card + duration held). The clip drops in with no re-edit of the rest when it lands.

## Voiceover (owner, tonight)

Owner self-records to the locked script (~2:45 read to leave margin under the hard stop): quiet room, phone mic, WAV or MP3. TTS via Hyperframes CLI is fallback ONLY if recording fails — decide at record time, don't pre-build both.

## Assembly order

Brief (`docs/demo-video/BRIEF.md`) → footage capture → placeholder assembly → benchmark numbers in → VO bed + captions → rack-walk slot-in → review → render → owner uploads unlisted + X post (Wed).

## Files / hygiene

- Tracked: `docs/demo-video/BRIEF.md`, demo script ref, `e2e/demo/` spec. **NOT tracked:** raw footage, renders, `node_modules`, render cache (large binaries must never enter git or the submission sync — keep them on the build machine / external drive).
- Hyperframes install is `npx` (no repo surgery): run the render-env check FIRST (`doctor`-equivalent) before writing composition — if the build machine can't render, escalate immediately, don't author blind.

## Acceptance

Video ≤ 3:00, opens with the SUB-01b migration sentence verbatim, closes with the roadmap what's-next beat (R-01/R-02, max 1–2 items, future-tense only — never show unbuilt UI), shows only shipped event features, sting + VO present, unlisted link plays back clean.

## Risks / verify first

- Hyperframes learning curve on deadline day — keep motion minimal; cuts and captions only.
- VO timing: script read must land ~2:45; time the first read before final assembly, trim words not footage.
- Footage gaps if the afternoon delivery slips — placeholder structure limits damage to one segment swap (backup screen-recording per SUB-02 covers a total miss).
- Never imply unbuilt features (R-01 late binding, visual search) appear in the product — the what's-next beat is words, not UI.
