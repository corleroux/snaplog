# DESIGN-01 — OpenDesign prompt pack (brief, not FR plan)

**RACI:** architect authors (this file) → owner runs the session → design-reviewer vets output → builder implements in task ⑨ (FR-SCH-05-EXT-06). Approved output is adopted as `DESIGN_SYSTEM.md` (closes handover ⓪b-A).
**Format:** tool-agnostic structured input. No OpenDesign input format verified yet — owner confirms what the session expects (URL, screenshots, text brief, or mix). This pack covers all three: paste §1–§5 as text, attach §6 screenshots, or point at repo URL.

## Purpose line (paste verbatim)

Startup track, "Build for Your World" — a trade-fair buyer points their phone at anything (fabric roll, garment on a rail) and gets a structured, searchable catalogue. Demo story: capture → extract → review → commit.

## 1. Buyer context

- User: wholesale buyer walking a crowded, noisy trade fair. One-handed phone use, gloves/stalls/coffee in the other hand.
- Environment: harsh overhead light, glare, shaky close-ups of fabric texture and garment labels; intermittent connectivity.
- So: huge touch targets (≥48px), bottom-anchored primary actions, high-contrast text, offline-tolerant states, zero tiny toggles, zero hover-dependent affordances.

## 2. Hard stack constraints (non-negotiable — reject anything unimplementable here)

- React 19 + Vite + Tailwind CSS + **shadcn/ui `new-york` style** (see `components.json`; primitives in `src/components/ui/`). Reuse: `Button`, `Card`, `Badge`, `Input`, `Skeleton`, `LoadingState`/`EmptyState`/`ErrorState`, `ConfidenceBadge`, bottom-action-bar pattern.
- Capacitor mobile clients — web-first responsive layout, no native-only patterns (no native nav bars, no HIG/Material-only gestures).
- No new design tokens outside Tailwind + shadcn theme; no custom component library; icons via existing set only.

## 3. Screens to design (5, mobile-first 390px)

1. **Capture** — big shutter button, thumbnail strip, category pre-select (fabric/garment), works one-handed.
2. **Schema-driven review** — field list driven by schema config; low-confidence/missing fields flagged with `ConfidenceBadge`, never auto-filled; explicit Commit button in bottom action bar.
3. **Catalogue list + search** — dense cards (photo, key fields, confidence dots), search bar, works with 100s of items.
4. **Video-job progress** — async job card: queued → processing → done/failed, with disabled/unavailable state when backend unconfigured; non-blocking (user can keep capturing).
5. **Fabric/garment switch** — one obvious segmented control, visible on capture + catalogue; must read clearly on camera.

## 4. Demo-legibility (graded on video)

- Readable at 720p inside a 3-minute video: ≥16px body, high-contrast badges, key actions visible without zoom.
- Fabric/garment switch and confidence flags must be distinguishable in a screen recording viewed on a laptop.

## 5. Out of scope (scope guard applies to design too)

No accounts, billing, ordering, checkout, extra categories, or native-app chrome. Two categories only: fabric, garment.

## 6. Owner checklist

- **Confirm session format:** what does the session accept — repo URL, screenshots, text brief, or mix? What output format returns (tokens, CSS, component specs)?
- **Bring:** repo URL (`snaplog`), 3–5 screenshots (current capture + review + list), this brief pasted as text, `components.json` + `src/styles/globals.css` for theme grounding.
- **5-min reshape rule:** if session needs different input shape, ping architect — do not improvise constraints away.

## 7. Acceptance before task ⑨ builds

design-reviewer vets output against: stack constraints (§2), one-handed mobile use (§1), demo-legibility (§4), scope guard (§5). Only approved output becomes `DESIGN_SYSTEM.md`.
