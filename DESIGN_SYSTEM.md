# Snaplog Design System

> Adopted from the approved OpenDesign output (`docs/brand/snaplog-app-redesign.html`,
> DESIGN-01 Stream C, CONDITIONAL PASS — see `docs/DESIGN-01-review-feedback.md`).
> Normative source for tokens is the `@theme` block below; where `docs/brand/DESIGN-HANDOFF.md`
> disagrees, this file wins.

## Stack

React + Vite + Tailwind v4 + shadcn/ui new-york (`components.json`) + Capacitor.
Mobile-first, one-handed, thumb-friendly; demo-legible on camera at 720p, sunlight-readable,
tap targets ≥44px. No accounts, billing, ordering, or extra categories in any UI.

## Tokens (normative — paste into `src/styles/globals.css` after `@import "tailwindcss"`)

```css
@theme {
  --color-ink: #16150F; --color-paper: #FAFAF7;
  --color-accent: #E34A0B; --color-kraft: #E8D5AC;
  --color-mist: #E0E5E8; --color-slate: #6B675C;
  --color-danger: #B42318; --color-danger-bg: #FDE8E8;
  --color-field-warn: #FFF7ED;
  --font-display: Georgia, 'Times New Roman', serif;
  --font-body: ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, Menlo, monospace;
  --radius-app: 14px; --radius-pill: 999px;
}
```

Semantic mapping (`:root`, HSL components): Paper → `--background`, Ink → `--foreground`
and `--primary-foreground` (Stall buttons take Ink text, never white), Stall `#E34A0B` →
`--primary`/`--ring`/`--accent`, danger → `--destructive`, Stall Grey → `--muted-foreground`.
Solid inks only — no gradients. `.dark` is untouched; the demo is light-only.

## Type

- Body: system stack (`--font-body` / Tailwind `font-sans`).
- Headings: Georgia/Times display (`font-display`).
- IBM Plex Mono — labels, numbers, prices only — via bundled `@fontsource/ibm-plex-mono`
  (`pnpm add`, imported in `src/main.tsx`). Never a Google-Fonts/network `<link>`.

## States

- Destructive `Alert` → `bg-danger-bg` / `border-danger`.
- Low-confidence or missing field → `border-danger` + `bg-field-warn` (`#FFF7ED` everywhere).
- Every screen carries loading, empty, error, and low-confidence states. Video has an
  additional unconfigured state (disabled action + reason line) — style only what exists;
  never invent Jobs actions (see `docs/plans/DESIGN-02C2c-*.md`).

## Primitive map (shadcn, no bespoke components)

| Screen | Primitives |
|---|---|
| Capture | Button, Sheet, Badge, ToggleGroup, Alert |
| Review | Card, Input, Badge, Alert, Separator |
| Catalogue | Input, Card, Badge, Skeleton, Tabs, Alert |
| Vendor | Avatar, Card, Button, Separator |
| Video/Jobs | Progress, Card, Alert, Button, Badge |

Review fields render from the live catalogue schema registry — never hardcoded.
Vendor is fixed before capture (route `vendorId`) and display-only at review.

## Pointers

- Execution order + owner checkpoints: `docs/plans/README.md`
- Brand masters + exports: `docs/brand/` (Stream A/B sources of truth)
