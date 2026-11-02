# DESIGN-02B — Social exports + logo sting (Stream B, operational)

**Branch:** `task/design-rework` (exports commit here) · **Priority:** P0, SUB-02 critical path · **Effort:** ~1–2h (owner records, builder verifies)
**Satisfies:** DESIGN-01 Stream B; SUB-02 inputs.
**Status vs staging (Mon Nov 2):** NOT DONE — `docs/brand/exports/` does not exist. Sources are ready (`snaplog-social-covers.html`, `snaplog-social-templates.html`, `snaplog-logo-sting.html`). **Due Mon EOD today**; Tue is recording day.

**Decision:** operational production, not code. Owner records (holds the browser session), builder independently verifies the file contract.

## Outputs (all under `docs/brand/exports/`)

- In-page SVG→PNG export: FB cover 851×315 + LinkedIn cover 1512×256 (`snaplog-social-covers.html`); IG post 1080×1080 + story 1080×1920 (`snaplog-social-templates.html`). Exact pixels, verified after export.
- Screen-record `snaplog-logo-sting.html` at 1920×1080, trimmed to exactly 3.0s. Verify duration + resolution with a media probe before accepting.
- Keep each template's alt text alongside its PNG (write-up/submission use).
- Editable HTML/SVG stay the source of truth — never edit an export; re-export from source.

## Acceptance

All four PNGs at exact dimensions + 3.0s 1080p sting in `docs/brand/exports/`; a second person verifies dimensions/duration independently; SUB-02 consumes without rework.

## Risks

- This blocks Tue recording. If exports slip past Mon EOD, SUB-02 opens without brand assets — escalate to owner same day, don't silently defer.
