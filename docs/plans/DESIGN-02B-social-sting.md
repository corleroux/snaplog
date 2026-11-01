# DESIGN-02B — Social exports + logo sting recording (Stream B, operational)

**Branch:** `task/design-rework` (exports commit here; see rule in DES-02A) · **Priority:** P0 (submission-critical: video opener, X post) · **Effort:** ~1–2h (owner + builder)
**Satisfies:** DESIGN-01 Stream B acceptance; SUB-02 inputs.
**Depends on:** design-reviewer PASS for Stream B (have it). No code dependency.

**Decision:** operational production work, not code. Owner records, builder verifies — split because the owner holds the browser/session while the builder owns the file contract SUB-02 will consume.

## Files / outputs (all under `docs/brand/exports/`, committed to the design branch)

- Run in-page SVG→PNG export on `snaplog-social-covers.html` (FB 851×315, LinkedIn 1512×256) and `snaplog-social-templates.html` (IG 1080×1080 + 1080×1920 story). Verify exact pixel dimensions after export.
- Screen-record `snaplog-logo-sting.html` at 1080p, trimmed to exactly 3.0s (timeline ruler + record instructions are in the page). Verify duration + resolution with any media probe before accepting.
- Editable HTML/SVG remain the source of truth — exports are derivatives. Never edit an export; re-export from source.

## Acceptance

`docs/brand/exports/` contains: FB cover, LinkedIn cover, IG post, IG story (all exact-pixel PNGs) + 3.0s 1080p sting; a second person (builder if owner recorded, and vice versa) independently verified dimensions/duration; SUB-02 can consume without rework.

## Risks / verify first

- This is on the SUB-02 critical path (recording Tue): exports must exist by **Mon EOD**. See producer/slot discussion in handover checkpoints.
- Keep alt text from the templates with the exported PNGs (write-up/submission page use).
