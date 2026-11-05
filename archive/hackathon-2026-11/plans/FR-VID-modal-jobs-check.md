# FR-VID-MODAL — Modal endpoint check: Jobs live vs unconfigured (owner-decided)

**Branch:** none (verification + secrets only; no code unless the fallback needs wiring, which already lives in DES-02C2) · **Priority:** P0 decision by Mon EOD · **Effort:** ~30 min (mostly owner)
**Satisfies:** FR-VID-05 readiness; de-risks Jobs polling (review risk 4).
**Depends on:** nothing. Do this first — everything about Jobs flows from the answer.

**Decision:** a binary check with two pre-planned outcomes. There is no third option and no new code in either branch.

## The check (owner — only you hold the Modal account, credits, and secrets)

1. Is the video pipeline deployed? (`modal deploy modal/video_pipeline.py` — historical fact, yes/no. No new deploy in this check.)
2. Is `MODAL_VIDEO_ENDPOINT_URL` set in Supabase secrets? Is `VIDEO_CALLBACK_SECRET` set in BOTH Supabase secrets and the Modal `snaplog-video` secret?
3. Does the endpoint answer? One authenticated request (or one supervised ≤60s probe clip on explicit owner go — counts as the FR-VID live probe, not a benchmark run).

## Outcome A — endpoint live

Jobs polling (`pollVideoJob` in `src/features/video/api/processVideo.ts` against `video_jobs`) is the real path. Builder confirms secrets wiring end-to-end (edge → Modal → callback) and reports status. No plan change.

## Outcome B — endpoint absent

Ship the `unconfig`/disabled state deliberately (DES-02C2 item 5): Jobs shows export-disabled + reason, entry points stay honest. The demo's video block then uses the backup screen-recording (SUB-02 risk line). No one debugs Modal on Tue.

## Pointers (what/where, since this task is new to you)

- The worker: `modal/video_pipeline.py` (`run_pipeline` + `process_video` webhook) + `modal/README.md` (deploy + probe checklist).
- The edge handoff: `supabase/functions/process-video-document/index.ts` (reads the two env vars, 500s without them).
- The secrets template: `supabase/.sb.env.example` (`MODAL_VIDEO_ENDPOINT_URL`, `VIDEO_CALLBACK_SECRET`).
- The client poller + table: `src/features/video/api/processVideo.ts`, migration `086_video_jobs.sql`.
- The budget: ~$1 Modal credit. A deploy is free; inference bills to Meta credits, not Modal. One probe clip costs cents of Modal CPU — this check is affordable, a benchmark is not.

## Acceptance

By Mon EOD the owner posts one line: "Jobs: LIVE" or "Jobs: UNCONFIGURED". Builder acts accordingly. Silence defaults to UNCONFIGURED on Tue 09:00 — no chasing.

## Outcome (Mon Nov 2 — Jobs: LIVE)

Builder executed all four steps (secret names verified only; temp material shredded):

1. Modal secret `snaplog-video` CREATED (MODEL_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, fresh `VIDEO_CALLBACK_SECRET` — rotated, both sides match).
2. Pipeline DEPLOYED via `modal deploy modal/video_pipeline.py` (~33s): `https://corleroux--snaplog-video-pipeline-process-video.us-east.modal.run` (`run_pipeline` + `process_video` live; deployment page confirms).
3. Supabase secrets SET: `MODAL_VIDEO_ENDPOINT_URL` + `VIDEO_CALLBACK_SECRET` (names verified).
4. Endpoint ANSWERS with zero GPU spent: wrong secret → 200 `unauthorized`; correct secret without `job_id` → 200 `job_id is required` in 1.1s.
- Deploy required 3 minimal compat fixes (modal/video_pipeline.py, +8/−3): `/root` existence guard for local PermissionError, `@modal.web_endpoint` → `@modal.fastapi_endpoint` (removed in current SDK), `fastapi[standard]` added to image. Committed post-verdict so repo matches deployed code.
- Owner re-rotated `VIDEO_CALLBACK_SECRET` to a locally-held value, verified both sides (curl signatures match); tree clean, zero secret material in git.
- Full ≤60s rack-walk probe deferred to later on explicit owner decision — no other M-J work remains. Jobs polling is the real path; the `unconfig` variant stays solely as demo-day fallback.
