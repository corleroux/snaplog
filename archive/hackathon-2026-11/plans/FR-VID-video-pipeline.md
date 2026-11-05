# FR-VID — Video rack-walk pipeline (SAM 3.1 via Meta API, Modal async)

**Branch:** `task/fr-vid-video-pipeline` · **Priority:** P0 · **Effort:** ~12h
**Satisfies:** FR-VID-01 (accept video), FR-VID-02 (SAM 3.1 isolation), FR-VID-03 (one record per item), FR-VID-05 (async, write-back). FR-VID-04 (dedupe) comes free via SAM's stable object identities.
**Depends on:** FR-MOD-02a, FR-SCH-03.

**Decision:** SAM 3.1 is called **via the Meta Model API** (`sam-3.1`, `POST /v1/responses`, streaming, short noun-phrase prompts, `@meta-sam/parser`; $0.20/1k frames ≈ $0.36 per minute) — not self-hosted. Modal is the **async orchestrator** (per AGENTS rule: edge hands off and returns; never block on video). Per-item extraction stays in the edge layer through the single TS provider interface — Modal never re-implements extraction; it calls back.

## Files

- Migration (next number, verify at branch time): add `rack_video` to the `scan_sessions.scan_type` check (constraint widen, additive intent); `video_jobs` table (scan_session, status, progress, items_found, error, timestamps).
- Client: video upload (mp4, size cap, queued like photos) + job status polling.
- Edge `supabase/functions/process-video-document/`: auth → scan_session + video_job rows → signed storage URL → POST to the Modal endpoint (shared secret) → **return immediately**.
- `modal/video_pipeline.py`: download → SAM streaming passes ("garment"; optional "dress"/"jacket") → `meta_sam_parser` → group masks by stable identity (the dedupe key) → best-frame crop per item → upload crops to storage → create item scan_sessions → POST each crop to a new edge `extract-isolated-item/` (service-secret auth) which runs the standard provider extract → payloads land on item scan_sessions → review/commit as usual.
- Tests: recorded SAM stream fixture → parser/crop test; edge tests with Modal mocked; e2e mocked at the function boundary.

## Acceptance

`pnpm test:edge` green. Observable on a real 30–60 s clip (owner's explicit ask, credits present): video → separate `catalogue_items` rows per garment with crops, `video_jobs.status` progressing, edge function never blocked.

## Risks / verify first

SAM noun-phrase recall on racks (run multi-pass if one phrase misses); per-request object cap — verify in docs/probe; no-Modal contingency: a single-pass edge function for ≤60 s demo clips (build only if credits are absent by Mon EOD); demo clips run in Standard mode.
