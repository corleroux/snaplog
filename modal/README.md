# Modal video pipeline (FR-VID)

Async orchestrator for rack-walk video processing. The edge function
`process-video-document` hands jobs here and returns immediately; this
pipeline downloads the video, isolates items with SAM 3.1 via the Meta Model
API, and calls back into `extract-isolated-item` per item. Per-item
extraction stays in the TS edge layer — Modal never re-implements it.

## Files

- `video_pipeline.py` — the Modal app (`snaplog-video-pipeline`, web endpoint `POST /process-video`). Multi-pass SAM prompts (`garment`, then `dress`/`jacket` on miss), grouping by stable track identity, best-frame crops, `video_jobs` updates.
- `sam_segment.js` — Node helper performing the SAM 3.1 streaming call (`responses.create`, `sam-3.1`, `input_video`, `@meta-sam/parser`). Only this file touches the SAM stream shape.
- `sam_parser.py` — pure grouping/crop-selection helpers (offline-testable).
- `test_sam_parser.py` — offline unit tests (`python3 -m unittest test_sam_parser`).

## Deploy (owner only — consumes Modal credits, never run unasked)

```bash
modal secret create snaplog-video \
  MODEL_API_KEY=... \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  VIDEO_CALLBACK_SECRET=...
modal deploy modal/video_pipeline.py
```

Then set `MODAL_VIDEO_ENDPOINT_URL` to the deployed endpoint URL via
`supabase secrets set` (see `supabase/.sb.env.example`).

## Live probe checklist (owner's explicit go, Standard mode)

1. Confirm `input_video` payload shape (URL vs upload) against Meta docs.
2. Confirm per-request object/track cap; adjust `SAM_PASSES`.
3. Confirm `@meta-sam/parser` video record shape; adjust `sam_segment.js` only.
4. Run on a real 30–60 s rack-walk clip: expect one `catalogue_items` row per
   garment, `video_jobs.status` progressing, edge never blocked.
5. Demo clips run in Standard mode.
