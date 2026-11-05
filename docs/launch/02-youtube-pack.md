# 02 — YouTube upload pack

Channel: **@Snaplog-app** (https://www.youtube.com/channel/UCiuqhD74A_z6lD0i1vxEFtw) — confirmed by owner Wed Nov 4. Video file: `docs/demo-video/renders/snaplog-demo.mp4`
(129s, 1920×1080, silent caption cut — if the owner dubs VO tonight, the
transcript below doubles as the VO script; timing is unchanged).

## Title options (pick 1)

1. **Snaplog: Point Your Phone at a Trade Fair, Get a Catalogue | Meta AI Hackathon Demo**
2. **Snap It. Catalogued. — AI That Turns Fair Photos Into Searchable Records**
3. **I Replaced the Trade-Fair Spreadsheet With a Camera (Snaplog Demo)**

Recommended: **#1** (names the product, the action and the event).

## Description (paste-ready)

> Every trade fair ends the same way: a camera roll you can't search, and
> a spreadsheet you build by hand.
>
> Snaplog turns phone photos into structured, searchable catalogue
> records for trade-fair buyers — starting with fabric and garments.
> Photograph a label or a garment, review what the AI extracted (flagged
> where it's unsure, never guessed), and commit it to your catalogue.
>
> extraction used to run on Gemini; this week we moved it behind a
> provider interface onto Muse Spark.
>
> A catalogue type is just a schema: fabric is one (composition, weight,
> weave, colour), garment is another (silhouette, construction, fabric,
> sizing) — garments were added as a versioned schema definition with no
> application code changes. Long video hands off asynchronously to Modal;
> SAM 3.1, via the Meta Model API, isolates each item, and every crop
> comes back through the same extract → review → commit path.
> (Rack footage in the demo is Mixkit stock B-roll; the isolation
> pipeline described here is the architecture behind it.)
>
> Built with Muse Spark, Muse Spark Open and SAM 3.1 on Meta's stack,
> with Modal for async video and the open-weights endpoint. Submitted to
> the Meta × Cerebral Valley AI Hackathon (Startup track — "Build for
> Your World").
>
> Benchmark note: model comparison figures shown are a DRY RUN on
> recorded fixtures (no live models were called for the table); Gemini
> appears as the recorded legacy baseline only and never runs in the
> product. Full method: see the project write-up in the submission repo.
>
> Back the self-funded build: https://www.backabuddy.co.za/campaign/back-the-launch-of-snaplog-snap-it-catalogued
>
> Chapters
> 0:00 Snap it. Catalogued.
> 0:17 From Gemini to Muse Spark
> 0:23 Fabric: label → extraction → review → commit
> 0:48 A catalogue type is just a schema
> 0:54 Garments: same pipeline, new schema
> 1:19 Walking the rack (async video)
> 1:42 Benchmark — recorded fixtures
> 1:54 What's next
>
> #AI #Hackathon #MetaAI #FashionTech #Startups #SouthAfrica

## Tags

snaplog, trade fair, fashion buying, textile catalogue, garment catalogue,
meta ai, muse spark, sam 3.1, modal, hackathon demo, ai product demo,
schema driven, south africa startups, fashion tech, sourcing

## Thumbnail

`art/youtube-thumbnail-1280x720.png` (1280×720, <2MB). Concept: real
review-screen still (the product, not a render) on Ink, three-word serif
promise "Snap it. Catalogued.", Stall chip naming the event. Readable at
mobile size; no benchmark numbers, no logos it can't back. Alt text in
`art/alt-text.txt`.

## Transcript (matches the on-screen captions of the 129s cut)

[0:00] (logo sting — no narration)
[0:03] Every trade fair ends the same way: a camera roll you can't search, and a spreadsheet you build by hand. Snap it. Catalogued.
[0:17] extraction used to run on Gemini; this week we moved it behind a provider interface onto Muse Spark. Before: a fabric catalogue. This week: schema registry, provider interface, garment-as-config, video, benchmark.
[0:23] Fabric — photo flow. Photograph the label. 1. Mark it as the Info image — extraction happens once, from the source you choose.
[0:31] 2. Muse Spark reads it against the fabric schema — composition, weight, construction.
[0:37] 3. Review: AI Extracted, flagged where unsure — never guessed. Commit keeps the source photo attached.
[0:48] Config, not code. A catalogue type is just a schema. Garment was added as a versioned schema definition. No application code changed — the same capture, review and commit.
[0:54] Garments — same pipeline. Switch the schema. Same flow. 1. Pick Garment, photograph the piece, mark it Info.
[1:02] 2. Extraction fills garment fields — silhouette, construction, fabric, closure, sizing. Schema version stamped on the record.
[1:08] 3. Review, correct, commit. It lands in the same catalogue, next to the fabrics.
[1:19] Or walk the rack on video. One walk, many items. (This beat uses Mixkit stock B-roll; the pipeline architecture is described next.)
[1:32] Video — asynchronous. The app never waits on video. Jobs hand off to Modal and return. SAM 3.1 — via the Meta Model API, never self-hosted — isolates each item, and every crop comes back through the same extract → review → commit path.
[1:42] Benchmark — recorded fixtures. Every provider, scored field by field. (Table: Muse Spark 1.3 Standard 83.1%; Muse Spark Open 100.0%; Gemini baseline 100.0% — dry run on recorded fixtures, no live models.)
[1:54] What's next: Next, we're making vendor assignment optional at capture — nothing you snap is ever lost. Built with Muse Spark, Muse Spark Open and SAM 3.1 on Meta's stack · Modal for async video and the open-weights endpoint. Snap it. Catalogued.

## Upload checklist

- [ ] Visibility: Unlisted for judging link first; switch to Public when the X post goes live (owner call)
- [ ] Thumbnail uploaded (art file above), title #1, description + chapters pasted
- [ ] Subtitles: upload this transcript as the caption track (matches the silent cut; also serves hearing-impaired judges)
- [ ] End screen (last 20s): subscribe + link to the X post if available
- [ ] Copy the final URL into `https://youtu.be/rgE5Kw5XFlo` everywhere (00-README swap list)
