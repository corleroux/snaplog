# Agent notes

## Mission

Snaplog turns phone photos and video into structured, searchable catalogues. We are in a ten-day hackathon build (Meta × Cerebral Valley) to prove one pipeline can catalogue more than one category: **fabric (exists) and garments (new)**, driven by schema configuration, not new code.

Requirements live in `docs/PRD.md`. Reference requirement IDs (`FR-SCH-*`, `FR-EXT-*`, `FR-VID-*`, `FR-MOD-*`, `FR-CAT-*`) in task titles, branch names and PR descriptions.

**Priority order:** P0 requirements first, then P1, then P2. Visual search (`FR-CAT-03`) is a stretch goal: only start it when all P0 and P1 work is done and the demo flow works end to end.

**Scope guard:** two categories only. Do not add accounts, billing, ordering, extra categories or native-app work. If a task is not traceable to a PRD requirement, ask before starting it.

## Architecture rules

- Workflow is capture → extract → review → explicit commit. Keep AI extraction separate from committing reviewed data, and preserve the `raw_payload` → `normalised_payload` → `reviewed_payload` audit chain.
- **Schema registry:** catalogue types (fabric, garment) are versioned schema definitions in config. Adding a category must not require application code changes (`FR-SCH-03`). Record the schema version on every extracted record.
- **Provider interface:** all extraction goes through one interface, image(s) + schema in, structured JSON + usage out. Providers: Gemini (baseline), Muse Spark via Meta Model API, a Meta open-weights model on Modal. Import provider SDKs only inside the provider modules, never in feature code.
- **Extraction runs:** record provider, model, schema version, raw output, latency and cost for every run.
- **Never guess.** Low-confidence or missing fields are flagged for review, not filled in (`FR-EXT-06`). Never overwrite a user's correction with a re-extraction.
- **Video is asynchronous.** Edge functions hand video jobs to Modal and return; Modal writes results back to Supabase. Never block an edge function on video processing.
- AI calls are backend-only. No model keys in the client bundle.
- Prefer additive migrations. Do not rename or drop existing fabric tables to introduce the generalised model.

## Setup and conventions

- Single-package React 19 + TypeScript + Vite app with Capacitor clients. Use **pnpm** (`pnpm-lock.yaml`). Entry is `src/main.tsx`, routing is `src/app/App.tsx`, feature code is in `src/features/`. Use the `@/` alias for `src/`.
- `pnpm install`, copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. `VITE_*` values are bundled for the browser; never put secrets there. Edge-function secrets are set via Supabase (`supabase/.sb.env.example` is the template), not loaded from `.env`.
- Follow `DESIGN_SYSTEM.md` for UI work.

## Checks

- Before finishing any task run `pnpm lint`, `pnpm check`, `pnpm test:run`. Run `pnpm build` when types or routing changed. One Vitest file: `pnpm test:run -- src/path/to/file.test.tsx`.
- Vitest runs in jsdom with `src/test/setup.ts`; Capacitor APIs are mocked. RLS tests: `pnpm test:rls`. Edge tests need `supabase start` first, then `pnpm test:edge`.
- Provider tests use recorded fixtures. Unit tests never call live model APIs. Only the benchmark runner (`FR-MOD-04`) calls live models, and only when explicitly asked.
- Playwright does not start the app: run `pnpm dev` separately (`BASE_URL` defaults to `http://localhost:5173`). Focus a spec with `pnpm test:e2e -- e2e/path/to/spec.ts`.
- CI workflows are disabled (`on: []`). Run relevant checks locally.

## Safety

- Staging and production share one Supabase project. Treat its data as production. Do not push migrations, deploy functions or mutate the remote project unless explicitly asked. Local database changes belong in `supabase/migrations/`.
- Do not run `modal deploy`, GPU jobs or benchmark runs unless explicitly asked. They consume sponsor credits.
- Confirm the configured URL before E2E tests that write data.

## Agents

| Agent | Use for |
|---|---|
| `architect` (primary) | Planning against the PRD; writes `docs/plans/<FR-ID>-<slug>.md`; never writes code |
| `builder` (primary, default) | Implementing one planned task at a time |
| `inference` | Provider interface, Muse Spark / Gemini / open-weights providers, Modal, SAM 3.1, benchmarks |
| `tester` | Unit, edge and Playwright tests; edits test files only |
| `reviewer` | Read-only PASS/BLOCK review against the PRD and these rules; run before finishing P0 work |
| `design-reviewer` | Read-only UI review against `DESIGN_SYSTEM.md`; run after UI changes |
| `explore` | Read-only code search |

Flow: architect plans → builder implements, delegating model-layer work to `inference` and tests to `tester` → `reviewer` (P0) and `design-reviewer` (UI) → PR. Only the builder commits.

## Workflow

- Branch from `staging` on `task/*` branches and integrate by PR. Never push directly to `main`.
- One plan in `docs/plans/` per task, one task per branch. Name branches after the requirement ID, for example `task/fr-sch-03-garment-schema`.
- Done means: the PRD requirement is met, checks pass, the demo flow still works, and any new environment variable is added to the relevant `.example` file.