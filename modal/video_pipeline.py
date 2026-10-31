"""
Snaplog video pipeline (FR-VID) — Modal async orchestrator.

Flow:
  1. Edge function POSTs a job (Bearer VIDEO_CALLBACK_SECRET).
  2. Download the video from the signed storage URL.
  3. Run SAM 3.1 via the Meta Model API (Responses API, streaming) through
     the bundled Node helper (sam_segment.js, uses @meta-sam/parser).
     Short noun-phrase prompts, multi-pass if recall is poor.
  4. Group detections by SAM stable track identity (= dedupe key, FR-VID-04).
  5. Best-frame crop per identity -> upload to scan-originals/video-crops/.
  6. Create one item scan_session per identity.
  7. POST each crop to the extract-isolated-item edge function (service-secret
     auth) — per-item extraction stays in the TS edge layer. Modal NEVER
     re-implements extraction.
  8. Mark video_jobs complete/failed.

Deploy (owner only, consumes Modal credits — never run unasked):
  modal secret create snaplog-video MODEL_API_KEY=... SUPABASE_URL=... \\
      SUPABASE_SERVICE_ROLE_KEY=... VIDEO_CALLBACK_SECRET=...
  modal deploy modal/video_pipeline.py

Live probe checklist (owner's explicit go, Standard mode):
  - Confirm input_video payload shape against Meta docs (URL vs upload).
  - Confirm per-request object/track cap; adjust SAM_PASSES below.
  - Confirm @meta-sam/parser video record shape; adjust sam_segment.js only.
"""

import json
import os
import subprocess
import tempfile
import urllib.request
from pathlib import Path

import modal

import sys

# Local imports work both offline (repo checkout) and remote (Modal mount).
sys.path.insert(0, "/root/modal")
sys.path.insert(0, str(Path(__file__).parent))

from sam_parser import group_by_track

MODAL_DIR = Path("/root/modal") if Path("/root/modal/sam_segment.js").exists() else Path(__file__).parent

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg", "nodejs", "npm")
    .pip_install("supabase", "opencv-python-headless", "numpy", "requests")
    .run_commands("npm install -g openai @meta-sam/parser")
    # Ship the Modal sources (pipeline, Node helper, parser) into the container.
    .add_local_dir("modal", remote_path="/root/modal")
)

app = modal.App("snaplog-video-pipeline")

# Short noun-phrase prompts, most general first. Later passes only run when an
# earlier pass finds nothing (recall fallback).
SAM_PASSES = ["garment", "dress", "jacket"]

# Minimum box area (fraction of frame) to keep a detection.
MIN_BOX_AREA = 0.005

# Padding around the crop box (fraction of box size), clamped to the frame.
CROP_PADDING = 0.1


def _fail(job_id: str, supabase, message: str) -> dict:
    supabase.table("video_jobs").update(
        {"status": "failed", "error": message}
    ).eq("id", job_id).execute()
    return {"ok": False, "error": message}


@app.function(image=image, secrets=[modal.Secret.from_name("snaplog-video")], timeout=1800)
def run_pipeline(payload: dict) -> dict:
    """Long-running worker: spawned by the webhook, never awaited by the edge."""
    model_api_key = os.environ["MODEL_API_KEY"]
    supabase_url = os.environ["SUPABASE_URL"]
    service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    callback_secret = os.environ["VIDEO_CALLBACK_SECRET"]

    from supabase import create_client
    supabase = create_client(supabase_url, service_key)

    job_id = payload.get("job_id")
    scan_session_id = payload.get("scan_session_id")
    video_url = payload.get("video_url")
    catalogue_type = payload.get("catalogue_type", "garment")
    callback_base_url = payload.get("callback_base_url")
    caller_secret = payload.get("callback_secret")

    if caller_secret != callback_secret:
        return {"ok": False, "error": "unauthorized"}

    supabase.table("video_jobs").update(
        {"status": "processing", "progress": 0.05}
    ).eq("id", job_id).execute()

    # Parent row gives event/vendor ownership for item scan sessions.
    parent = (
        supabase.table("scan_sessions")
        .select("event_id, vendor_id, created_by")
        .eq("id", scan_session_id)
        .single()
        .execute()
        .data
    )
    if not parent:
        return _fail(job_id, supabase, "parent scan session not found")

    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        video_path = tmpdir / "input.mp4"
        try:
            _download(video_url, video_path)
        except Exception as exc:
            return _fail(job_id, supabase, f"video download failed: {exc}")

        detections: list[dict] = []
        for phrase in SAM_PASSES:
            try:
                detections = _run_sam_pass(video_path, video_url, phrase, model_api_key, tmpdir)
            except Exception as exc:
                return _fail(job_id, supabase, f"SAM pass '{phrase}' failed: {exc}")
            if detections:
                break

        if not detections:
            supabase.table("video_jobs").update(
                {"status": "complete", "progress": 1.0, "items_found": 0}
            ).eq("id", job_id).execute()
            return {"ok": True, "items": 0}

        tracks = group_by_track(detections)
        supabase.table("video_jobs").update(
            {"progress": 0.5, "items_found": len(tracks)}
        ).eq("id", job_id).execute()

        import cv2

        cap = cv2.VideoCapture(str(video_path))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 1
        items = 0
        for track_id, dets in tracks.items():
            best = max(dets, key=lambda d: d["box"]["w"] * d["box"]["h"])
            if best["box"]["w"] * best["box"]["h"] < MIN_BOX_AREA:
                continue
            frame = _read_frame(cap, best["frame_index"], frame_count)
            if frame is None:
                continue
            crop_path = tmpdir / f"{track_id}.jpg"
            _save_crop(frame, best["box"], crop_path)
            storage_path = f"video-crops/{job_id}/{track_id}.jpg"
            supabase.storage.from_("scan-originals").upload(
                storage_path, crop_path.read_bytes(),
                {"content-type": "image/jpeg", "upsert": "true"},
            )

            item_session = (
                supabase.table("scan_sessions")
                .insert({
                    "event_id": parent["event_id"],
                    "vendor_id": parent["vendor_id"],
                    "scan_type": "garment_flat",
                    "source_image_path": storage_path,
                    "extraction_status": "pending",
                    "created_by": parent["created_by"],
                })
                .select("id")
                .single()
                .execute()
                .data
            )

            # Callback into the edge layer for extraction (service-secret auth).
            import requests
            resp = requests.post(
                f"{callback_base_url}/extract-isolated-item",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {callback_secret}",
                },
                json={
                    "parent_scan_session_id": scan_session_id,
                    "video_job_id": job_id,
                    "item_scan_session_id": item_session["id"],
                    "storage_path": storage_path,
                    "mime_type": "image/jpeg",
                    "scan_type": "garment_flat",
                    "catalogue_type": catalogue_type,
                },
                timeout=300,
            )
            if resp.status_code != 200:
                # Item extraction failures are recorded on the item session by
                # the edge function; the job continues with other items.
                continue
            items += 1
        cap.release()

    supabase.table("video_jobs").update(
        {"status": "complete", "progress": 1.0, "items_found": items}
    ).eq("id", job_id).execute()
    return {"ok": True, "items": items}


@app.function(image=image, secrets=[modal.Secret.from_name("snaplog-video")])
@modal.web_endpoint(method="POST")
def process_video(payload: dict) -> dict:
    """Lightweight webhook: validates, spawns the worker, returns 202-style
    immediately. The edge function awaits only this fast dispatch."""
    callback_secret = os.environ["VIDEO_CALLBACK_SECRET"]
    if payload.get("callback_secret") != callback_secret:
        return {"ok": False, "error": "unauthorized"}
    if not payload.get("job_id"):
        return {"ok": False, "error": "job_id is required"}
    run_pipeline.spawn(payload)
    return {"ok": True, "spawned": True}


def _download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "snaplog-video/1.0"})
    with urllib.request.urlopen(req, timeout=600) as resp, open(dest, "wb") as f:
        while True:
            chunk = resp.read(4 * 1024 * 1024)
            if not chunk:
                break
            f.write(chunk)


def _run_sam_pass(
    video_path: Path, video_url: str, phrase: str, model_api_key: str, tmpdir: Path
) -> list[dict]:
    """Run one SAM streaming pass via the Node helper; return detection records."""
    helper = MODAL_DIR / "sam_segment.js"
    out_path = tmpdir / f"records-{phrase}.json"
    proc = subprocess.run(
        ["node", str(helper), video_url, phrase, str(out_path)],
        capture_output=True,
        text=True,
        timeout=1500,
        env={**os.environ, "MODEL_API_KEY": model_api_key},
    )
    if proc.returncode != 0:
        raise RuntimeError(f"sam_segment.js failed: {proc.stderr[-2000:]}")
    return json.loads(out_path.read_text())


def _read_frame(cap, frame_index: int, frame_count: int):
    frame_index = max(0, min(int(frame_index), frame_count - 1))
    cap.set(1, frame_index)  # CAP_PROP_POS_FRAMES
    ok, frame = cap.read()
    return frame if ok else None


def _save_crop(frame, box: dict, dest: Path) -> None:
    import cv2

    h, w = frame.shape[:2]
    bw, bh = box["w"] * w, box["h"] * h
    pad_w, pad_h = bw * CROP_PADDING, bh * CROP_PADDING
    x0 = max(0, int(box["x"] * w - pad_w))
    y0 = max(0, int(box["y"] * h - pad_h))
    x1 = min(w, int((box["x"] + box["w"]) * w + pad_w))
    y1 = min(h, int((box["y"] + box["h"]) * h + pad_h))
    cv2.imwrite(str(dest), frame[y0:y1, x0:x1])
