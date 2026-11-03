# Demo script — 3:00 hard cap (SUB-02, draft for Tue Nov 3 record)

> Judges stop watching at 3:00. Live product footage only — no slides.
> Record with the app on Standard mode. Keep the backup screen-recording of
> the video pipeline in case live SAM is slow on the day.

## 0:00–0:30 — Hook + before/this-week

[Buyer walking a rail, phone in hand, camera roll chaos — 3 quick cuts]

"Every trade fair ends the same way: a camera roll you can't search, and a
spreadsheet you build by hand. Snap it. Catalogued."

[SUB-01b migration sentence — verbatim, do not paraphrase:]
"extraction used to run on Gemini; this week we moved it behind a
provider interface onto Muse Spark."

Before: a fabric catalogue at `snaplog@hackathon-baseline`. This week:
schema registry, provider interface, garment-as-config, video, benchmark.

## 0:30–1:15 — Fabric tag with Chinese label

[Photograph a fabric composition label with Chinese text.]

- Tap Extract → Muse Spark reads the label, translates to English, fills
  composition, weight, construction against the fabric schema.
- Review screen: fields flagged where the model is unsure — nothing guessed.
- Tap Commit. Record lands in the catalogue, linked to its source photo.

## 1:15–2:00 — Garment: config, not code

[Terminal / registry row on screen — the schema INSERT.]

"A catalogue type is just a schema. Garment was added as one database row.
No application code changed."

[Photograph a garment → extract → review → commit, same flow, garment fields:
silhouette, construction, fabric, closure, sizing.]

## 2:00–2:35 — Rack-walk video

[Start a 30-second rack-walk clip. Job card: queued → processing.]

"Long video is handed to Modal and returns immediately — the app never waits.
SAM 3.1 isolates each item; every crop comes back through the same extract →
review → commit path."

[Items appear individually as their own records.]

## 2:35–2:45 — Benchmark (one table flash, numbers only)

[Full-screen table, ~10 seconds, no narration beyond one line:]

"Same captures, every provider, field-level accuracy. Muse Spark versus
Muse Spark Open versus the recorded Gemini baseline."

[Use the live numbers from the Tue benchmark run; label the Gemini row "baseline (recorded fixtures — never called live)". Dry-run reference: muse-spark 83.1% mean (59/71, exact-match lower bound), Gemini and Spark Open fixtures 100% — provisional, replaced live. If no live run lands, do not narrate "same captures" over mixed-denominator dry-run numbers — flash the table with its fixture footnote or cut the beat to a spoken one-liner.]

## 2:45–3:00 — What's next + close

[Face to camera, future tense only — no unbuilt UI on screen.]

"Next, we're making vendor assignment optional at capture — nothing you snap
is ever lost. Snap it. Catalogued."

## Pre-record checklist

- [ ] Demo data staged: vendor card, fabric composition tag (Chinese), garment rack, 30–60 s rack-walk clip
- [ ] App on Standard mode (`muse-spark-1.3`); no contributor endpoints
- [ ] Backup screen-recording of the video pipeline ready
- [ ] Benchmark table numbers pasted from the Tue live run
- [x] Architect framing review of this script: CHANGES REQUIRED applied (benchmark-honesty edits 1+2, Tue Nov 3) — recording unblocked
