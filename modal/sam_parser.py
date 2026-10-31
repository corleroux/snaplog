"""
Pure grouping/crop-selection helpers for the video pipeline.

Kept dependency-free so they can be unit-tested offline without Modal,
OpenCV or network access. video_pipeline.py imports these functions.
"""

from __future__ import annotations


def group_by_track(detections: list[dict]) -> dict[str, list[dict]]:
    """Group detections by SAM stable track identity (the dedupe key)."""
    tracks: dict[str, list[dict]] = {}
    for det in detections:
        track_id = str(det.get("track_id") or det.get("object_id") or "unknown")
        tracks.setdefault(track_id, []).append(det)
    if len(tracks) > 1 and "unknown" in tracks:
        del tracks["unknown"]
    return tracks


def pick_best_detection(detections: list[dict]) -> dict:
    """Pick the detection with the largest box area (ties: highest confidence)."""
    def key(det: dict) -> tuple[float, float]:
        box = det.get("box", {})
        area = float(box.get("w", 0)) * float(box.get("h", 0))
        conf = det.get("confidence")
        return (area, float(conf) if isinstance(conf, (int, float)) else -1.0)

    return max(detections, key=key)


def crop_box_to_pixels(
    box: dict, frame_width: int, frame_height: int, padding: float = 0.1
) -> tuple[int, int, int, int]:
    """Convert a normalized box to clamped pixel coords (x0, y0, x1, y1)."""
    bw = box["w"] * frame_width
    bh = box["h"] * frame_height
    x0 = max(0, int(box["x"] * frame_width - bw * padding))
    y0 = max(0, int(box["y"] * frame_height - bh * padding))
    x1 = min(frame_width, int((box["x"] + box["w"]) * frame_width + bw * padding))
    y1 = min(frame_height, int((box["y"] + box["h"]) * frame_height + bh * padding))
    return (x0, y0, x1, y1)
