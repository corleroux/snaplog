# DESIGN-02C2c — Stream C port: video + review styling

**Branch:** `task/design-rework` ONLY · **Priority:** P1 (after C2b; Jobs/video last per cut order) · **Effort:** ~3h
**Parent:** DESIGN-02C2 master gate. **Status (Mon Nov 2):** not started. **Blocked decision:** owner Modal check due Mon EOD today (see Risks).

## 1. Video — style what exists, invent nothing

There is **no Jobs screen in staging**. The only video surface is `VideoCaptureScreen` (`items/video`): phases idle (Choose Video) → uploading → polling ("Isolating items…") → done (items found → Back to Vendor; zero items → EmptyState/Retake) → error (ErrorState + retry via file picker), Cancel in BottomActionBar while processing, hidden video file input (mp4/mov ≤200MB). Restyle these states only.
- The prototype's Jobs buttons (Review stills, Export anyway, error-job Dismiss, disabled Export) have **no backing functionality — never create them** (B3: no toast stubs, no invented actions).

## 2. Review styling — core is DONE, style only

`CatalogueItemReviewScreen` + `SchemaReviewForm`: registry-driven fields, ConfidenceBadge, missing-field flags (field-warn tokens ride C1), extraction warnings, save blocked by validation, hero + thumbnail strip. Apply Stream C styling; do not touch field binding, validation, or commit. Prototype literals never ship.
- Not present in catalogue review: a display-only vendor line. Adding one is data work, not styling — **do not add here**; flag to owner/architect if wanted.

## Acceptance

Master-gate acceptance; all five video phases + review low-confidence state checked at 720p.

## Risks — owner decision (do not bury)

- **"Jobs: LIVE or UNCONFIGURED" (FR-VID-modal-jobs-check, due Mon EOD):** silence defaults to UNCONFIGURED Tue 09:00. If UNCONFIGURED, a disabled/unavailable state for the video entry is *behaviour*, not styling — STOP and escalate to architect for a functional plan; do not invent an Export-disabled Jobs UI in this plan. If LIVE, style the polling flow as-is.
