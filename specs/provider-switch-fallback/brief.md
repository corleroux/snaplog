# Brief: provider-switch-fallback

## Problem
Extraction is locked to a single default provider (Muse Spark). If that provider fails or is unavailable, extraction fails and the buyer loses the capture. FR-MOD-03 was cut during the hackathon. Buyers need the ability to switch extraction provider by configuration and have an automatic fallback on failure so captures are never lost to provider outages.

## Outcome
The extraction provider is configurable; on provider failure the system automatically falls back to an alternate provider and the capture completes; the buyer sees which provider produced each extraction.

## In scope
- Provider selection in settings (list of configured providers)
- Default provider configurable
- Automatic fallback to alternate provider when the primary fails during extraction
- Provider used is recorded on each extraction run (audit trail)
- Extraction retry with fallback provider on transient errors

## Out of scope
- Per-capture provider override (provider is a setting, not a per-capture choice)
- Adding new providers beyond the configured set (contract change)
- Provider cost comparison UI (benchmark feature covers this)
- Fallback for non-extraction providers (SAM, etc.)

## Assumptions
- Provider switching happens in settings, not at capture time
- Fallback provider is pre-configured (not chosen at failure time)
- Gemini remains available as a baseline provider but is not the demo default

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R1 — additive configuration + fallback logic in the extraction layer; changes provider selection behaviour but no data contract rewrite.
