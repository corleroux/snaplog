# Design System (stub — full system arrives via the OpenDesign session)

> **Status:** stub only. The owner is running an OpenDesign redesign imminently;
> its approved output becomes this file (handover ⓪b-A, task ⑨a). Do not
> hand-write a full system here — it would be throwaway work.

## Stack facts (verified against the repo)

- UI primitives: **shadcn/ui new-york** (`components.json`) under `@/components/ui`,
  including `LoadingState`, `EmptyState`, `ErrorState`, `ConfidenceBadge`,
  `bottom-action-bar`, `section-container`, `toast`.
- Styling: **TailwindCSS** (`tailwind.config.js`, `src/styles/globals.css`).
- App: **React + Vite + Tailwind + shadcn new-york + Capacitor** — design output
  must be implementable in these. No native-only patterns.
- Mobile-first, one-handed, thumb-friendly capture for noisy, crowded trade fairs.

## Pointers

- Execution order, owner checkpoints, demo-legibility rules: `docs/plans/README.md`.
- Demo-legibility bar: readable on camera at 720p inside a 3-minute video.
- Scope guard applies to design too: no accounts, billing, or ordering UI.
