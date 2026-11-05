# DESIGN-02C2 — Stream C screens port (visual-only) — master gate

**Branch:** `task/design-rework` ONLY (never merge without owner "merge design-rework") · **Priority:** P1, only after DES-02C1 is DONE · **Effort:** ~10–12h across C2a–C2c
**Satisfies:** DESIGN-01 Stream C implementability gate (screens half).
**Status vs staging (Mon Nov 2):** NOT STARTED. Execute as three sub-plans in order: **DESIGN-02C2a** (chrome + capture) → **DESIGN-02C2b** (catalogue + vendor + details) → **DESIGN-02C2c** (video + review styling). Stop at the Tue 12:00 gate wherever you are; tokens-reskin + current layout then ships, no debate.

**Decision: visual port only — functionality is FROZEN.** Every handler, route, validation rule, conditional element and test-visible string in staging today must survive behaviour-identical. Prototype is a styling reference, never a functional spec: where prototype and code disagree, code wins.

## Already DONE in staging — do not rebuild

- **G1 guard** (old C2 item 6): `catalogueRouteWrappers.tsx` `useGuardedRouteIds` → `Navigate` replace. DONE (FR-SCH-05b).
- **Review functional core** (old exclusion): schema-driven fields from the live registry, `schemaVersion` stamped server-side on commit (FR-SCH-05/⑨). Prototype `SCHEMAS` literals must never ship — already satisfied; registry is the only source.
- **B3 vendor stubs:** staging `VendorDetailScreen` Edit/QR actions are real (not toast stubs) — keep them; the prototype's toast-stub Jobs buttons must never be created (C2c).

## Mandatory first step — interaction inventory

Before touching any screen, list every interactive/conditional element (handlers, overlays, banners, pickers, validation, disabled states) from the sub-plan's inventory plus your own grep. If inventory and prototype conflict, inventory wins; flag it in the PR, never silently drop behaviour.

## Acceptance (all sub-plans)

Suite **as merged on staging** green with zero test changes — if a styling change forces a test edit, STOP: that's a behaviour change, escalate to architect. Reviewer P0 + design-reviewer pass; 25-state checklist + on-device 720p camera check; owner sign-off before ANY merge.

## Risks

- Design branch rebases onto staging after other merges; resolve conflicts for behaviour preservation.
- Partial Stream C work stays unmerged on this branch if the Tue 12:00 trigger fires.
