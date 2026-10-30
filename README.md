# Snaplog

Mobile-first catalogue system for capturing vendor and fabric data at trade fairs.
Core workflow: **capture → extract → review → commit**.

AI assists, humans confirm: extraction and commit are always separate steps, and every
transition preserves a `raw_payload` → `normalised_payload` → `reviewed_payload` audit chain.

## Domain model

```
Event → Vendor → Fabric Style → Variant → Inventory → Price
```

Supporting entities: Scan Sessions, Drafts, Fabric Images.

## Tech stack

| Layer    | Stack                                              |
|----------|----------------------------------------------------|
| Frontend | React 19, TypeScript, Vite, Capacitor (Android+iOS)|
| Backend  | Supabase (Postgres + RLS, Edge Functions, Storage) |
| AI       | Backend-only, via Supabase Edge Functions          |
| UI       | shadcn/ui, TailwindCSS                             |
| Analytics| PostHog (US cloud, project `403472`)               |

Package manager: **pnpm exclusively** (`pnpm-lock.yaml` is the lockfile).

## Repo layout

- `src/features/` — feature folders (vendors, styles, events, auth, admin, sharing, …)
- `src/components/`, `src/lib/`, `src/app/`, `src/hooks/` — shared UI, utilities, routing
- `supabase/migrations/` — 82 migrations: schema, RLS, RPCs, pg_cron schedule
- `supabase/functions/` — 15 edge functions (`_shared/` holds CORS, auth, AI client, logging)
- `supabase/.sb.env.example` — template for edge-function secrets (tracked)
- `supabase/.sb.env` — your filled-in secrets (gitignored, never committed)
- `e2e/` — Playwright tests · `android/`, `ios/` — Capacitor native projects
- `AGENTS.md` — agent operating instructions (source of truth for workflow rules)

## Getting started

```bash
pnpm install
cp .env.example .env          # then fill in VITE_* values
cp supabase/.sb.env.example supabase/.sb.env   # then fill in secrets
pnpm dev
```

Supabase (one shared project, ref `<project-ref>`, for both staging and
production slots until a planned split — treat all data as production data):

```bash
supabase link --project-ref <project-ref>   # needs SUPABASE_ACCESS_TOKEN
supabase db push                                   # apply migrations
supabase secrets set --env-file supabase/.sb.env --project-ref <project-ref>
supabase functions deploy --project-ref <project-ref>
```

Edge-function secrets are **not** loaded from `.env` — they must be set via
`supabase secrets set` (or the dashboard). `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` are auto-injected; never set them manually.

## Edge functions

| Function | Requires | Status |
|---|---|---|
| `extract-vendor-document`, `extract-fabric-document` | `GEMINI_API_KEY` | Active |
| `commit-reviewed-vendor-document`, `commit-reviewed-fabric-document` | — | Active |
| `health-check`, `get-public-catalogue` | (`GEMINI_API_KEY` for health) | Active, no JWT check |
| `cleanup-orphaned-images`, `generate-thumbnails`, `get-admin-users` | — | Active |
| `send-email` | — (placeholder: logs + audit row, no provider wired) | Active |
| `submit-feedback` | `GITHUB_TOKEN` (optional, skips gracefully) | Active |
| `send-email-catalogue`, `send-notification`, `send-scheduled-report` | `RESEND_API_KEY` | **Disabled** — no key provided |
| `poll-posthog-errors` | `POSTHOG_PERSONAL_API_KEY` | **Disabled** — no key provided |

Re-enable a disabled function after providing its key with:

```bash
supabase functions deploy <name> --project-ref <project-ref>
```

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

## Mobile builds

EAS profiles in `eas.json`: `preview` (internal APK / simulator), `staging` and
`production` (AAB / archive). CI is currently **disabled** — the workflows in
`.github/workflows/` are outdated and their triggers are turned off until they
are rebuilt, so tags like `v1.0.0` do not trigger builds right now. Local
builds still work via `pnpm cap:build:android` / `pnpm cap:build:ios`.

## Branching

| Branch | Purpose |
|---|---|
| `main` | Production — never push directly |
| `staging` | Integration — all task branches merge here via PR |
| `task/*` | Short-lived branches off `staging` |

Work is tracked in the Supabase task tables via `/task-create` → `/task-plan` →
`/task-claim` → `/task-complete`. See `AGENTS.md` for the full rules
(classification, phases, definition of done, engineering closeout).
