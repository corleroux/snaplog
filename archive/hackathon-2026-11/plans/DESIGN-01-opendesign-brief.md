# DESIGN-01 — OpenDesign prompt pack (task ⑨a)

**Author:** architect · **Status:** ready for the owner to run · **Effort:** brief ~2h (done here), output review 1h (design-reviewer), implementation 2–4h (builder, Wave 5/6)
**Feeds:** ⑨ (schema review UI builds in the approved language), SUB-02 (logo in video opener, social creatives for submission page + X post), `DESIGN_SYSTEM.md` (approved output replaces the stub).

**Session order (value-per-risk): Stream A → B → C.** Stop after any stream if the clock bites — each stream ships independently.

## Running the session (owner)

Feed each stream as one prompt unit plus the attached inputs. Confirmed OpenDesign input format at session time (URL / screenshots / text brief / mix) and reshape — prompts below are tool-agnostic. Attach: 3–5 screenshots of the current app (capture, review, catalogue list, vendor page), the buyer context line, and the hard constraints. Do NOT attach vendor PII captures — use garments/swatches only.

## Stream A — Brand kit (first, zero code risk)

> Design a brand kit for "Snaplog — Snap it. Catalogued.", a mobile-first trade-fair cataloguing app for fashion buyers. Deliver: (1) primary app logo + monochrome variant (legible at 48px app-icon size and as a 2cm fair-badge sticker); (2) Capacitor app icon set + splash screen (iOS 1024px, Android adaptive foreground/background); (3) social avatar (circle-cropped, readable at 98px); (4) wordmark lockup with tagline. Style: confident, craft-adjacent (fabric, markets), high contrast for sunlight legibility. No gradients that band on cheap screens; must work in single colour for swing-ticket printing.

Acceptance: SVG + PNG exports at all sizes; single-colour version exists.

## Stream B — Social creatives (second, zero code risk)

> Using the Stream A brand kit, deliver: (1) Facebook + LinkedIn cover images (current recommended dimensions, safe-area aware); (2) one Instagram grid post template + one story template announcing the hackathon build ("We turned trade-fair chaos into a searchable catalogue — built with Meta's AI stack"); (3) a 3-second logo sting / video bumper for the demo-video opener. Keep all text in safe areas; supply editable sources, not flattened images.

Acceptance: covers + templates + bumper, editable sources included.

## Stream C — App redesign (third, gated — see fallback)

Keep: the bottom navigation with the central `+` capture action and its logic (tap = capture entry, context-aware: vendor page → pre-filled vendor, elsewhere → must first enter a vendor page (no vendor-less capture; R-01 deferred). Vendor is FIXED before capture (route `vendorId`) and DISPLAY-ONLY at review (`<p>`/banner, never submitted). R-01 late binding is explicitly out of scope for this redesign: no assign-or-create vendor during review, no Unassigned inbox.)

> Redesign Snaplog as a mobile-first app (web is secondary — this must feel like a distributed native app, built in React + Vite + Tailwind + shadcn/ui new-york + Capacitor; no native-only patterns, no custom gesture libs). Screens: (1) capture (one-handed, thumb-reachable, sun-readable); (2) schema-driven review with confidence flags and pre-filled vendor display (vendor fixed at capture — no assign-or-create, per the Keep clause); (3) catalogue list + text search; (4) vendor page; (5) video-job progress. Every screen needs loading, empty, error and low-confidence states. Fabric/garment switch must be obvious on camera at 720p. Out of scope: accounts, billing, ordering, extra categories, desktop layouts. Corrections to the previous pass: (1) review screen must also show the garment field set — fields render from the active catalogue schema, never hardcoded; (2) add a Jobs-screen variant for "pipeline unconfigured" (export disabled + reason line); (3) re-emit all tokens as Tailwind v4 @theme, including danger/danger-bg/field-warn; (4) body font is the system stack, IBM Plex Mono (via bundled Fontsource, never a network link) for labels/numbers/prices only, Georgia/Times display for headings.

Acceptance (implementability gate — design-reviewer enforces): every screen maps to shadcn primitives + Tailwind tokens (no bespoke component that needs building from scratch); colour/type/spacing emitted as tokens, not pictures.

## Hard constraints (all streams)

- Stack-locked: React + Vite + Tailwind + shadcn new-york + Capacitor. Nothing that can't ship in that stack.
- Scope guard: no accounts, billing, ordering, extra categories — including in mockup flows.
- Narrative-neutral: the redesign must not imply features that don't exist (no vendor-optional UI unless R-01 is built; no visual-search entry point — FR-CAT-03 is cut).
- Demo-legibility: contrast and tap targets that survive phone-camera capture at 720p.

## Fallback (if Stream C can't be fully built before Tue EOD)

Tokens-only reskin: apply the new brand (logo, colours, type) onto the existing screens + Capacitor icon/splash swap, and build ⑨ in the current layout. Full Stream C screens become `DESIGN_SYSTEM.md` content and write-up "what's next" — no shame in it, and the demo still opens with the new brand.
