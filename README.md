# Snaplog

Mobile-first AI-assisted trade fair capture system for vendors and textile products.

## What this bootstrap pack contains

- `PRD-Claude-Code.md` — build-ready product requirements
- `Architecture.md` — system architecture and diagrams
- `CLAUDE.md` — repo rules for Claude Code
- `docs/diagrams/` — exported architecture diagrams
- `docs/decisions/` — architecture decision records
- `supabase/migrations/` — schema and RLS migrations
- `supabase/functions/` — edge function placeholders
- `src-reference/` — reference structure for frontend implementation

## Core principles

- capture first, structure second
- AI assists, humans confirm
- extraction and commit are separate
- auditability is mandatory
- offline support is required

## Suggested reading order

1. `PRD-Claude-Code.md`
2. `Architecture.md`
3. `CLAUDE.md`
4. `supabase/migrations/`

## Edge function targets

- `extract-vendor-document`
- `commit-reviewed-vendor-document`
- `extract-fabric-document`
- `commit-reviewed-fabric-document`

## Suggested implementation order

1. app shell
2. auth
3. migrations
4. events and vendors read flow
5. vendor extraction flow
6. fabric extraction flow
7. review and commit flows
8. offline hardening

## Mobile Builds

This project uses EAS Build (Expo Application Services) for automated Android and iOS builds via Capacitor.

### Prerequisites

- Expo account with EAS access
- EAS project ID configured in `app.json` (`extra.eas.projectId`)
- GitHub secrets configured: `EXPO_TOKEN`, Android keystore, Apple API key

### Build Profiles

| Profile | Purpose | Output |
|---------|----------|--------|
| `preview` | Internal testing | Android APK, iOS Simulator |
| `staging` | Staging environment | Android AAB, iOS Archive |
| `production` | Production release | Android AAB, iOS Archive |

### Triggering Builds

**Manual (GitHub Actions):**
1. Go to **Actions** → **Mobile Build** → **Run workflow**
2. Select platform (`android`, `ios`, or `all`)
3. Select profile (`preview`, `staging`, `production`)

**Via Git tags:**
```bash
git tag v1.0.0
git push origin v1.0.0
```
This triggers both Android and iOS production builds.

### Local Builds

```bash
pnpm cap:sync              # Sync web assets to native platforms
pnpm cap:build:android    # Build Android APK/AAB
pnpm cap:build:ios        # Build iOS app
```

### Artifacts

- Android: Find APK/AAB in EAS dashboard or GitHub Actions artifacts
- iOS: Download from EAS dashboard (requires Apple Developer account)

---

## Testing
  1. Run `pnpm install` to install Vitest
  2. Run `pnpm test` to execute smoke tests
  3. Run `deno run --allow-read --allow-env scripts/check-env.ts` to validate environment
  4. Follow `docs/testing/MANUAL_QA_CHECKLIST.md` for manual QA


