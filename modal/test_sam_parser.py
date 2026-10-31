"""Offline unit tests for sam_parser.py. Run: python3 -m unittest test_sam_parser."""

import json
import os
import unittest

from sam_parser import crop_box_to_pixels, group_by_track, pick_best_detection

FIXTURE = os.path.join(
    os.path.dirname(__file__),
    "..",
    "supabase",
    "functions",
    "_tests",
    "fixtures",
    "sam",
    "sam-stream.json",
)


class TestSamParser(unittest.TestCase):
    def test_group_by_track_groups_stable_identities(self):
        with open(FIXTURE) as f:
            records = json.load(f)["records"]
        tracks = group_by_track(records)
        # Fixture: two garments tracked across frames.
        self.assertEqual(set(tracks.keys()), {"track-a", "track-b"})
        self.assertEqual(len(tracks["track-a"]), 3)
        self.assertEqual(len(tracks["track-b"]), 2)

    def test_group_by_track_drops_unknown_when_real_tracks_exist(self):
        tracks = group_by_track([
            {"track_id": "track-a", "frame_index": 0, "box": {"x": 0, "y": 0, "w": 0.1, "h": 0.1}},
            {"frame_index": 1, "box": {"x": 0, "y": 0, "w": 0.1, "h": 0.1}},
        ])
        self.assertEqual(set(tracks.keys()), {"track-a"})

    def test_pick_best_detection_prefers_largest_area(self):
        best = pick_best_detection([
            {"track_id": "t", "frame_index": 0, "box": {"x": 0, "y": 0, "w": 0.1, "h": 0.1}, "confidence": 0.99},
            {"track_id": "t", "frame_index": 5, "box": {"x": 0, "y": 0, "w": 0.4, "h": 0.4}, "confidence": 0.5},
        ])
        self.assertEqual(best["frame_index"], 5)

    def test_crop_box_to_pixels_clamps_to_frame(self):
        self.assertEqual(
            crop_box_to_pixels({"x": 0.8, "y": 0.8, "w": 0.3, "h": 0.3}, 1000, 500, padding=0.1),
            (770, 385, 1000, 500),
        )

    def test_crop_box_to_pixels_no_padding(self):
        self.assertEqual(
            crop_box_to_pixels({"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.4}, 1000, 500, padding=0),
            (100, 100, 400, 300),
        )


if __name__ == "__main__":
    unittest.main()
