# DESIGN-02C2 — Stream C screens port (visual-only)

**Branch:** `task/design-rework` (never merge without owner sign-off — rule in DES-02A) · **Priority:** P1 (only after DES-02C1 is DONE) · **Effort:** ~10–12h
**Satisfies:** DESIGN-01 Stream C implementability gate (screens half); vendor-locked flow.
**Depends on:** DES-02C1 DONE; design-reviewer Stream C verdict (have it: conditional pass + B3/G1).

**Decision: visual port only — functionality is FROZEN.** Every handler, route, validation rule, and conditional UI element that exists today must exist after this plan, pixel-moved but behaviour-identical. The prototype is a styling reference, never a functional spec: where prototype and code disagree, code wins and the prototype element is adapted or dropped.

## Mandatory first step — interaction inventory (before touching any screen)

Grep and list every interactive/conditional element on each screen being ported (handlers, overlays, banners, pickers, validation, disabled states). Known example that MUST survive: the capture-page thumbnail overlay letting the user mark an upload as info-image vs normal image — absent from the prototype, non-negotiable in the port. If the inventory and the prototype conflict, inventory wins; flag the conflict in the PR, don't silently drop behaviour.

## Files (in this order — stop at the Tue 12:00 gate wherever you are)

1. Chrome: bottom nav + central `+` (preserve context-aware vendor behaviour: vendor page → pre-filled, elsewhere → vendor page first; vendor fixed at capture). Bottom-nav active state per tokens.
2. Capture screen in new visuals (inventory first — info overlay, thumb-zone, banners).
3. Catalogue screen (text search only — FR-CAT-03 stays cut; filter tabs; REVIEW badges).
4. Vendor page (header, style grid; B3: Edit-details/QR-code → wire to an EXISTING route or DELETE — no new functionality to satisfy a prototype button).
5. Jobs screen incl. the `unconfig` variant verbatim (disabled Export + reason + queued-kept note); error-job Dismiss → wire to existing dismiss or delete (B3).
6. G1 guard in `catalogueRouteWrappers.tsx`: `!eventId || !vendorId` → redirect to vendor list (replace) or `ErrorState`. Never start a session/extract on empty ids.

**Explicitly EXCLUDED (not this plan):** the review screen's functional core — schema-driven field binding + `schemaVersion` stamping rides with task ⑨ (N3). This plan may apply Stream C review *styling* only after ⑨'s core merges, by rebasing the design branch onto `staging`. Prototype `SCHEMAS` literals must never ship — delete, don't port.

## Acceptance

Existing e2e suite green with zero test changes (no behavioural diff); reviewer P0 pass (B3/G1 closed); design-reviewer pass; 25-state checklist + on-device 720p camera check done; owner sign-off obtained before ANY merge to staging.

## Risks / verify first

- ⑨ overlap on the review screen: coordinate, don't duplicate — if ⑨ hasn't merged, do not touch review files here.
- Rebase discipline: design branch rebases onto staging after ⑨/other merges; resolve conflicts in favour of behaviour preservation.
- Tue 12:00 trigger (handover): if Stream C isn't substantially complete, stop — tokens-reskin + current layout ships, no debate.
