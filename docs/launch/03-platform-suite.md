# 03 — Platform suite (Facebook · Instagram · X · TikTok · LinkedIn)

One story, five dialects. Long-form posts carry the verbatim migration
sentence; short bios never imply features that don't exist.

## Bios (paste-ready)

- **Facebook Page name:** Snaplog · **Category:** Product/service
  About (short): "Snaplog turns trade-fair photos into structured,
  searchable catalogues for fabric & garment buyers. Snap it. Catalogued."
- **Instagram bio (150 ch):**
  "Point your phone at it. Get a catalogue. 📸 Fabric + garments for
  trade-fair buyers. Built on Meta AI. Snap it. Catalogued."
- **X bio (160 ch):**
  "Snaplog — phone photos → structured, searchable catalogues for
  trade-fair buyers. Fabric + garments, one schema-driven pipeline.
  Self-funded 🇿🇦 Snap it. Catalogued."
- **TikTok bio (80 ch):**
  "Trade-fair photos → searchable catalogue. Snap it. Catalogued. 📸"
- **LinkedIn tagline (120 ch):**
  "Schema-driven cataloguing for trade-fair buyers — phone photos become
  structured, searchable fabric & garment records."

## Launch posts

### Facebook (long-form, pin it)

> After a trade fair, the real work used to start: matching hundreds of
> photos to notes and building the catalogue spreadsheet by hand.
>
> Snaplog changes the first step. Photograph a fabric label or a garment
> at a vendor's stand, review what the AI extracted — flagged where it's
> unsure, never guessed — and commit it to a searchable catalogue.
>
> extraction used to run on Gemini; this week we moved it behind a
> provider interface onto Muse Spark. Because a catalogue type is just
> a schema, garments joined fabrics with no application code changes —
> and rack video catalogues item by item in the background (in the
demo, the rack footage is Mixkit stock B-roll illustrating this).
>
> Built with Muse Spark, Muse Spark Open and SAM 3.1 on Meta's stack
> for the Meta × Cerebral Valley hackathon. I'm self-funded and building
> this from South Africa — if you know a buyer, a sourcing agent, or
> anyone who lives out of a camera roll at fairs, sharing this post is
> the biggest help you can give.
>
> Watch the 2-minute demo: {{VIDEO_URL}}
> Back the build: https://www.backabuddy.co.za/campaign/back-the-launch-of-snaplog-snap-it-catalogued

### Instagram (feed post — use existing IG post export, then demo stills carousel)

> Your camera roll after a trade fair is not a catalogue. Now it can be.
>
> Snaplog reads the label, drafts the record, flags what it's unsure of
> — you review and commit. Fabric first, garments next, same pipeline:
> a catalogue type is just a schema.
>
> Built on Meta's AI stack for the Meta × Cerebral Valley hackathon.
> Self-funded 🇿🇦 — a share today genuinely moves this forward.
>
> Demo link in bio. Snap it. Catalogued.
>
> #FashionTech #Textiles #GarmentDistrict #TradeFair #Sourcing
> #SouthAfrica #StartupSA #MetaAI #BuildInPublic #SmallBusinessSA

Carousel order: (1) existing IG post 1080×1080, (2) fabric review still
(`docs/demo-video/project` footage still — use art/youtube-thumbnail
crop), (3) garment review still, (4) rack still, (5) "Snap it.
Catalogued." card (IG story export frame). Story on launch day: IG story
export + link sticker to {{VIDEO_URL}} + poll sticker ("Your fair photos:
organised or chaos?").

### X

Pinned post = the main viral post (01). Profile header: new X header
art (below). Bio link: {{VIDEO_URL}} until the Back-a-Buddy page exists,
then the campaign.

### TikTok (first post)

Post the 129s demo cut natively (under TikTok's limit) with the TikTok
cover art; caption:

> POV: your trade-fair camera roll just became a searchable catalogue.
> Snaplog photographs → AI draft → you review → committed record.
> Fabric + garments, one pipeline. Built on Meta AI for a hackathon —
> self-funded from South Africa 🇿🇦 #FashionTech #SmallBusiness
> #SouthAfrica #TextileTok #StartupTok

Pin a comment: "Full story + how it works: {{VIDEO_URL}} — a like &
share today helps a self-funded startup more than you'd think."
Stitch/duet bait (day 2): film the "spreadsheet at midnight" pain as a
15s hook and stitch the demo's first 15s onto it (owner phone footage —
no new claims, same story).

### LinkedIn (professional long-form)

> I build software for trade fairs. This week, for the Meta × Cerebral
> Valley AI Hackathon, I rebuilt my fabric-catalogue app's extraction
> layer around a simple idea: a catalogue type is just a schema.
>
> extraction used to run on Gemini; this week we moved it behind a
> provider interface onto Muse Spark. Fabric is one schema (composition,
> weight, weave, colour). Garments became a second (silhouette,
> construction, fabric used, sizing) — added as a versioned schema
> definition, with no application code changes. The same capture →
> extract → review → commit pipeline now catalogues both, and long rack
> video is processed asynchronously (Modal orchestration; SAM 3.1 via
> the Meta Model API) so buyers never wait on uploads at a crowded fair
> (the demo video illustrates the rack walk with Mixkit stock B-roll).
>
> Two design rules I'm keeping: never guess — low-confidence fields are
> flagged for review, and a buyer's correction is never overwritten by a
> re-extraction. The audit trail (raw → normalised → reviewed payload)
> survives every step.
>
> Built with Muse Spark, Muse Spark Open and SAM 3.1. I'm self-funded,
> based in South Africa, and looking for the first buyers and sourcing
> partners who want their next fair to catalogue itself. A reshare
> reaches rooms I can't — thank you.
>
> 2-minute demo: {{VIDEO_URL}}
> Support the build: https://www.backabuddy.co.za/campaign/back-the-launch-of-snaplog-snap-it-catalogued

## Artwork map

| Slot | File | Status |
|---|---|---|
| FB cover 851×315 | `art/snaplog-fb-cover-851x315.png` (master: docs/brand/exports/) | REUSE |
| FB/IG/X/TikTok/LinkedIn profile | `docs/brand/snaplog-avatar-512.png` | REUSE |
| IG post 1080×1080 | `art/snaplog-ig-post-1080x1080.png` (master: docs/brand/exports/) | REUSE |
| IG story 1080×1920 | `art/snaplog-ig-story-1080x1920.png` (master: docs/brand/exports/) | REUSE |
| LinkedIn cover 1512×256 | `art/snaplog-linkedin-cover-1512x256.png` (master: docs/brand/exports/) | REUSE |
| X header 1500×500 | `art/x-header-1500x500.png` | NEW (this pack) |
| TikTok first-post cover 1080×1920 | `art/tiktok-cover-1080x1920.png` | NEW (this pack) |
| YouTube thumbnail 1280×720 | `art/youtube-thumbnail-1280x720.png` | NEW (this pack, see 02) |
| Profile convenience copy 512×512 | `art/snaplog-profile-512.png` | NEW (avatar master copy) |

Alt text for every image: `art/alt-text.txt`.
