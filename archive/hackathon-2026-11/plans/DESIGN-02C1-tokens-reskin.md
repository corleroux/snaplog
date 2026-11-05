# DESIGN-02C1 — Tokens reskin (Stream C fallback deliverable)

**Branch:** `task/design-rework` ONLY (never merge without owner "merge design-rework") · **Priority:** P0 — this IS the Tue 12:00 fallback UI · **Effort:** ~1–2h
**Satisfies:** DESIGN-01 implementability gate (tokens half); demo-legibility floor.
**Depends on:** DES-02A on the same branch.
**Status vs staging (Mon Nov 2):** NOT DONE. `src/styles/globals.css:13-51` still carries pre-Snaplog `@theme` + orange/dark `:root` tokens; no Fontsource installed. **Must be DONE (not started) before Tue 12:00.**

**Decision:** tokens + semantic mapping only. No layout or behaviour change. Font rule (resolves DESIGN-HANDOFF:22 vs review §7.2-A3): **body = system stack; IBM Plex Mono for labels/numbers/prices only; Georgia/Times display headings.** Review spec wins — it is the later, corrected decision.

## Files (in order)

1. **Adopt `DESIGN_SYSTEM.md` on this branch first** (still a stub): normative `@theme` (redesign `:98-109`), font rule, primitive map (`:114-122`), state matrix — closes handover ⓪b-A. In the same commit fix the stale `DESIGN-HANDOFF.md:22,44` lines (mono body / "extend block") to point at this rule (review N2).
2. **Tokens:** paste the `@theme` block (redesign `:98-109`) into `src/styles/globals.css` after `@import "tailwindcss"` (`src/main.tsx:3` imports it); ignore the v3 `extend` shim. Then **remap semantic HSL vars in `:root`** — new ink/paper tokens alone are inert; components read `--background/--foreground/--primary/...`: Paper `#FAFAF7`→background, Ink `#16150F`→foreground + primary-foreground (Stall buttons get Ink text), Stall `#E34A0B`→primary/ring/accent, danger `#B42318`, danger-bg `#FDE8E8`, field-warn `#FFF7ED`, muted = Stall Grey `#6B675C`. Keep HSL-component format; verify rendered colours. Leave `.dark` untouched.
3. **Font:** `pnpm add @fontsource/ibm-plex-mono` (pnpm, not `npm i`); `import '@fontsource/ibm-plex-mono'` in `src/main.tsx`; never a Google-Fonts `<link>`. `--font-sans/display/mono` in `@theme`; body `font-sans`, headings `font-display`.
4. **Radii + states:** `--radius` → 14px base (`--radius-app`); low-confidence/missing fields in `SchemaReviewForm.tsx` (`border-amber-500/50`) → `border-danger` + `bg-field-warn` (#FFF7ED everywhere); destructive alerts → `bg-danger-bg`/`border-danger`.

## Acceptance

Spot-check rendered Ink/Paper/Stall surfaces (not token strings), danger + field-warn states, Plex Mono numerals only; `pnpm lint && pnpm check && pnpm test:run` green; suite as merged on staging passes with **zero test changes**; mandatory 720p sunlight-contrast + bottom-nav active-state screenshot check.

## Risks

- Silent legibility regression (wrong token file, unmapped semantic vars, unbundled font) is the failure mode — the rendered spot-check is mandatory.
