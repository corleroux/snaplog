/**
 * sam_segment.js — SAM 3.1 streaming helper for the Modal video pipeline.
 *
 * Usage: node sam_segment.js <video_url> <noun_phrase> <out_records_json>
 *
 * Streams `responses.create({ model: "sam-3.1", stream: true })` with an
 * `input_video` part, parses detection records with @meta-sam/parser, and
 * writes a JSON array of detection records:
 *   [{ track_id, frame_index, box: {x, y, w, h} (normalized 0-1), confidence }]
 *
 * VERIFY IN PROBE (owner's explicit go): the input_video payload shape and
 * the video record field names. If the video stream uses different record
 * helpers than `recordsOfKind`, adjust ONLY the extractRecords() function.
 */

import { writeFileSync } from "node:fs";
import OpenAI from "openai";
import { parseImageStream, recordsOfKind, decodeMaskToRaster } from "@meta-sam/parser";

const [videoUrl, phrase, outPath] = process.argv.slice(2);

if (!videoUrl || !phrase || !outPath) {
  console.error("Usage: node sam_segment.js <video_url> <noun_phrase> <out_records_json>");
  process.exit(2);
}

const client = new OpenAI({
  baseURL: "https://api.meta.ai/v1",
  apiKey: process.env.MODEL_API_KEY,
});

const stream = await client.responses.create({
  model: "sam-3.1",
  input: [
    {
      type: "message",
      role: "user",
      content: [
        { type: "input_text", text: phrase },
        { type: "input_video", video_url: videoUrl },
      ],
    },
  ],
  stream: true,
  metadata: { mask_encoding: "one_bit" },
});

function extractRecords(parsed) {
  // Image-shaped stream: adjust in probe if video records differ.
  const records = recordsOfKind(parsed, "detection");
  return records.map((r, i) => ({
    track_id: String(r.track_id ?? r.object_id ?? `track-${i}`),
    frame_index: Number(r.frame_index ?? 0),
    box: {
      x: Number(r.box?.x ?? r.bbox?.[0] ?? 0),
      y: Number(r.box?.y ?? r.bbox?.[1] ?? 0),
      w: Number(r.box?.w ?? r.bbox?.[2] ?? 0),
      h: Number(r.box?.h ?? r.bbox?.[3] ?? 0),
    },
    confidence: typeof r.confidence === "number" ? r.confidence : null,
  }));
}

let records = [];
const seen = new Set();
for await (const event of stream) {
  const parsed = parseImageStream(event);
  if (!parsed) continue;
  // Accumulate across stream events — never overwrite. Dedupe identical
  // (track, frame) records in case events repeat cumulative state.
  for (const r of extractRecords(parsed)) {
    const key = `${r.track_id}:${r.frame_index}`;
    if (!seen.has(key)) {
      seen.add(key);
      records.push(r);
    }
  }
}

// Touch decodeMaskToRaster so mask decoding stays wired for the probe;
// crop selection uses boxes only (masks available when needed).
void decodeMaskToRaster;

writeFileSync(outPath, JSON.stringify(records));
console.log(JSON.stringify({ records: records.length }));
