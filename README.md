# Snaplog

**Snap it. Catalogued.**

Snaplog turns phone photos and video into structured, searchable catalogues. It started as a mobile-first app for fashion buyers at international trade fairs: a buyer meets dozens of vendors and comes home with a camera roll they can't search, notebooks of vendor and product details, and a spreadsheet to build by hand. Snaplog replaces that. The buyer photographs the fabric and the vendor's business card or stall front, and the app produces structured catalogue records.

Core workflow: **capture → extract → review → commit**. AI assists, humans confirm: extraction and commit are separate steps, and every transition preserves a `raw_payload` → `normalised_payload` → `reviewed_payload` audit chain.

## Hackathon build (Meta × Cerebral Valley)

The goal for the ten-day build is to prove the pipeline generalises: **a catalogue type is just a schema.** Fabric is one, garment is another, and adding a category should be configuration, not code. Full requirements are in [`docs/PRD.md`](docs/PRD.md).

| Capability | Status |
|---|---|
| Photo extraction for fabric and vendor documents (Gemini) | Existing |
| Review and explicit commit workflow, audit chain | Existing |
| Schema registry for catalogue types | Hackathon |
| Muse Spark extraction via Meta Model API | Hackathon |
| Garments as a second category, config only | Hackathon |
| Video capture: item isolation with SAM 3.1 on Modal | Hackathon |
| Model benchmark: Gemini vs Muse Spark vs Meta open weights | Hackathon |
| Visual search ("find something like this") | Stretch |

## How it works

```
Phone (photo / video)
        │
        ▼
Supabase Edge Function ──► provider interface ─┬─► Gemini (baseline)
        │                                      ├─► Muse Spark (Meta Model API)
        │                                      └─► Meta open weights (Modal)
        │
        └─ video ─► Modal job: SAM 3.1 isolates items ─► extract each item
                                    │
                                    ▼
                          results written to Supabase
```

Long video jobs are handed to Modal and written back to Supabase, so edge functions never wait on them.

## Domain model

```
Event → Vendor → Item → Variant → Inventory → Price
```

Today's tables call the item a Fabric Style. The hackathon generalises it through catalogue types and their schemas without renaming existing tables. Supporting entities: Scan Sessions, Drafts, Images, Extraction Runs (provider, model, schema version, latency, cost).

## Tech stack

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, Capacitor (Android + iOS) |
| Backend | Supabase (Postgres + RLS, Edge Functions, Storage) |
| AI | Backend-only: Gemini, Muse Spark (Meta Model API), Meta open weights |
| Heavy compute | Modal (SAM 3.1, open-weights model, benchmark jobs) |
| UI | shadcn/ui, TailwindCSS |
| Analytics | PostHog (US cloud) |

Package manager: **pnpm exclusively** (`pnpm-lock.yaml` is the lockfile).

## Repo layout

- `src/features/`: feature folders (vendors, styles, events, auth, admin, sharing, …)
- `src/components/`, `src/lib/`, `src/app/`, `src/hooks/`: shared UI, utilities, routing
- `supabase/migrations/`: schema, RLS, RPCs, pg_cron schedule
- `supabase/functions/`: edge functions (`_shared/` holds CORS, auth, AI client, logging)
- `supabase/.sb.env.example`: template for edge-function secrets (tracked)
- `supabase/.sb.env`: your filled-in secrets (gitignored, never committed)
- `docs/PRD.md`: hackathon product requirements · `docs/plans/`: one plan per task
- `e2e/`: Playwright tests · `android/`, `ios/`: Capacitor native projects
- `AGENTS.md`: agent operating instructions (source of truth for workflow rules)

## Getting started

```bash
pnpm install
cp .env.example .env          # then fill in VITE_* values
cp supabase/.sb.env.example supabase/.sb.env   # then fill in secrets
pnpm dev
```

Supabase (one shared project, ref `<project-ref>`, for both staging and production until a planned split; treat all data as production data):

```bash
supabase link --project-ref <project-ref>   # needs SUPABASE_ACCESS_TOKEN
supabase db push                            # apply migrations
supabase secrets set --env-file supabase/.sb.env --project-ref <project-ref>
supabase functions deploy --project-ref <project-ref>
```

Edge-function secrets are **not** loaded from `.env`; set them via `supabase secrets set` or the dashboard. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected; never set them manually.

## Edge functions

| Function | Requires | Status |
|---|---|---|
| `extract-vendor-document`, `extract-fabric-document` | `GEMINI_API_KEY` | Active |
| `commit-reviewed-vendor-document`, `commit-reviewed-fabric-document` | none | Active |
| `health-check`, `get-public-catalogue` | (`GEMINI_API_KEY` for health) | Active, no JWT check |
| `cleanup-orphaned-images`, `generate-thumbnails`, `get-admin-users` | none | Active |
| `send-email` | none (placeholder: logs + audit row, no provider wired) | Active |
| `submit-feedback` | `GITHUB_TOKEN` (optional, skips gracefully) | Active |
| `send-email-catalogue`, `send-notification`, `send-scheduled-report` | `RESEND_API_KEY` | **Disabled**, no key provided |
| `poll-posthog-errors` | `POSTHOG_PERSONAL_API_KEY` | **Disabled**, no key provided |

Re-enable a disabled function after providing its key: `supabase functions deploy <name> --project-ref <project-ref>`.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm preview` | Vite dev / build / preview |
| `pnpm check` / `pnpm lint` | `tsc --noEmit` / eslint |
| `pnpm test` / `pnpm test:run` | Vitest (watch / once) |
| `pnpm test:e2e` | Playwright against staging |
| `pnpm test:edge` | Deno edge-function tests (local stack) |
| `pnpm test:rls` | RLS policy tests |
| `pnpm cap:sync` / `cap:build:android` / `cap:build:ios` | Capacitor sync / native builds |
| `deno run --allow-read --allow-env scripts/check-env.ts` | Validate environment |

## Evaluating models

The benchmark compares Gemini, Muse Spark and a Meta open-weights model on the same captures: field-level accuracy, translation quality, latency and cost per item. It runs against a hand-labelled set of real captures (composition tags in several languages, fabric swatches, garments on racks, business cards and stall fronts). Results are published in the write-up.

## Mobile builds

EAS profiles in `eas.json`: `preview` (internal APK / simulator), `staging` and `production` (AAB / archive). CI is currently **disabled**: the workflows in `.github/workflows/` are outdated and their triggers are off, so tags like `v1.0.0` do not trigger builds. Local builds work via `pnpm cap:build:android` / `pnpm cap:build:ios`.

## Branching

| Branch | Purpose |
|---|---|
| `main` | Production, never push directly |
| `staging` | Integration, all task branches merge here via PR |
| `task/*` | Short-lived branches off `staging` |

Each task has a plan in `docs/plans/` and its own branch, named after the PRD requirement it delivers. See `AGENTS.md` for the agent roles and full rules.