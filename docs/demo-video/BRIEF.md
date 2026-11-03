---
workflow: general-video
flow: automation
storyboard: no
message: "extraction used to run on Gemini; this week we moved it behind a provider interface onto Muse Spark — and a catalogue type is just a schema."
destination: youtube-unlisted
aspect: 1920x1080
language: en
length: 180s-hard-cap (~2:45 target)
audience: Meta × Cerebral Valley hackathon judges (Startup track)
angle: real-footage product demo, no slides, no mockups
---

# Demo video BRIEF — DEMO-01 (HyperFrames assembly, real footage only)

Source of truth for the script: `docs/DEMO-SCRIPT.md` (locked, architect
framing-reviewed Tue Nov 3 — recording unblocked). This brief is the
production contract; the script is the words. If they disagree, the script
wins and this file is updated in the same commit.

## Intent

A 3-minute (hard cap; judges stop at 3:00) unlisted demo proving one
pipeline catalogues fabric AND garments from schema configuration, on
Meta's stack. Every second of app on screen is genuine screen footage of
the working product. Composition is deliberately boring — cuts, captions,
lower-thirds, sting — the product is the star and simple renders fast on
deadline day.

## Beat map (from the locked script)

| Time | Beat | Footage source |
|---|---|---|
| 0:00–0:30 | Hook (camera-roll chaos) + SUB-01b migration sentence verbatim | Phone B-roll (owner) + caption card |
| 0:30–1:15 | Fabric: Chinese composition label → Muse Spark extract + translate → review (flags, nothing guessed) → commit | `e2e/demo/` spec, fabric test (Playwright video) |
| 1:15–2:00 | Garment as config: schema row on screen → capture → extract → review → commit, same flow | `e2e/demo/` spec, garment test + terminal/registry shot |
| 2:00–2:35 | Rack-walk video → async Modal job → SAM 3.1 isolation → items appear individually | Timed placeholder NOW; owner's rack-walk clip drops into this slot with no re-edit of the rest |
| 2:35–2:45 | Benchmark table flash, numbers only (Gemini row labelled "baseline (recorded fixtures — never called live)") | Live benchmark run output (`docs/benchmark-results.md`) |
| 2:45–3:00 | What's-next (R-01 vendor late binding, future tense only, no unbuilt UI) + "Snap it. Catalogued." | Owner to camera |

## Assets

- `docs/brand/exports/snaplog-logo-sting-1920x1080.mp4` — opener sting. VERIFIED Tue Nov 3 (builder second-person check): 1920×1080, H.264, 30 fps, exactly 3.000 s. Visual/pixel QA still open.
- `docs/demo-video/` (this dir) — BRIEF tracked; `project/`, `footage/`, `renders/` gitignored. Raw footage and renders NEVER enter git or the submission sync.
- Playwright footage — `e2e/demo/demo-capture.demo.ts` via `playwright.demo.config.ts` (separate config, Pixel 5, `video: 'on'`). Output lands in `test-results/demo/` (gitignored). NOT a CI test: the `.demo.ts` suffix keeps it out of the default config's testMatch; `pnpm test:e2e` never runs it.
- Rack-walk segment — timed placeholder (title card + duration held) until the owner's clip lands.
- Benchmark numbers — pending the owner-approved live run on images (Standard mode only). Until then the beat uses the dry-run table with its fixture footnote, or is cut to a spoken one-liner (per DEMO-SCRIPT note — never narrate "same captures" over mixed-denominator dry-run numbers).
- VO — owner self-records tonight to the locked script (~2:45 read). TTS (HyperFrames CLI) is fallback ONLY if recording fails; decide at record time.

## Customizations

- Cuts, captions, lower-thirds only. No invented motion, no stock, no mockup UI.
- Fabric/garment switch must be legible on camera at 720p (demo-legibility rule).
- Captions name the models where they run: Muse Spark (extraction), SAM 3.1 via Meta Model API (isolation, orchestrated by Modal), Muse Spark Open (Modal shared endpoint, benchmark leg).

## Notes — constraints & runbook

- **All-Meta runtime:** footage is recorded with the app on Standard mode (`muse-spark-1.3`). No contributor endpoints, no Gemini call anywhere in the footage path.
- **Local stack only:** the demo spec seeds and writes ONLY against a local Supabase stack. It hard-fails if the Supabase URL points at `*.supabase.co` unless `DEMO_ALLOW_REMOTE=1` is set with explicit owner go (marked demo records + cleanup). Failover auth: `secrets/secrets.md` creds via `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` env only — never printed, logged, or committed.
- **Footage runbook:** `supabase start` (local) → serve edge functions locally with the Standard `MODEL_API_KEY` → `pnpm dev` with `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` pointed at the local stack → `pnpm test:e2e:demo`. Stage real images via `DEMO_FABRIC_IMAGE` (Chinese composition label) / `DEMO_GARMENT_IMAGE` (defaults to the staged jacket front). Reset the local DB between takes for a clean catalogue.
- **Render env (checked Tue Nov 3, `hyperframes doctor`):** CLI 0.9.8, Node 24, FFmpeg/ffprobe 7.0.2, headless Chrome — all OK. Risks: 3.7 GB RAM (renders may fail — draft quality first, one worker) and `/tmp` is a 1.9 GB tmpfs (frames cache MUST be relocated: `HYPERFRAMES_EXTRACT_CACHE_DIR` on the main disk, 939 GB free). Docker absent (only blocks `--docker` renders). No render attempted yet — first composition render is the real test; escalate immediately if it OOMs rather than authoring blind.
- **Never imply unbuilt features:** R-01 late binding and visual search are spoken future-tense only in the close — never shown as UI.
- Assembly order: this brief → footage capture → placeholder assembly → benchmark numbers in → VO bed + captions → rack-walk slot-in → `npx hyperframes check` → preview → owner approves → render → owner uploads unlisted + X post (Wed, before Nov 4 9 PM ET).
