# Snaplog: Hackathon Product Requirements Document

**Owner:** Cor le Roux, Collectif · **Version:** 0.1 (hackathon build plan) · **Status:** Draft for iteration · **Event:** Meta × Cerebral Valley AI hackathon (ten-day build)

## 1. Product Summary

Snaplog is a schema-driven cataloguing engine that turns phone photos and video into structured, searchable records. It extends the existing Trade Fair Fabric Catalogue, a mobile-first app that fashion buyers use at international trade fairs, from one category (fabric) to many, with garments as the second category and "anything" as the long-term goal.

### 1.1 The problem

A buyer meets dozens of vendors at a fair and comes home with a camera roll they can't search, notebooks full of vendor and product details, and a spreadsheet to build by hand, matching every photo to the right note and the right item. Vendor details are captured by photographing a business card or stall front, which adds more unstructured material to reconcile.

### 1.2 The idea

A catalogue type is just a schema. Fabric is one (composition, weight, weave, colour). Garment is another (silhouette, construction, fabric used, sizing). The model reads whatever the buyer captures against the schema that applies, and the structure stays the same: Event → Vendor → Item → Variant. Adding a new category should be configuration, not code.

### 1.3 One-line pitch

Snaplog: point your phone at anything and get a structured, searchable catalogue, starting with fabric and garments at trade fairs. Tagline: "Snap it. Catalogued."

## 2. Goals, Non-Goals and Success Criteria

### 2.1 Goals

1. **Prove generalisation.** Show that one pipeline catalogues two different categories (fabric, garments) from configuration alone.
2. **Use Meta's stack meaningfully.** Muse Spark for multimodal extraction with structured outputs, SAM 3.1 for isolating items, and a Meta open-weights model as a cost and control comparison.
3. **Handle video.** A walk along a rack or stand returns separate, catalogued items.
4. **Make model choice evidence-based.** Benchmark Gemini, Muse Spark and an open-weights model on the same real captures.
5. **Ship a working end-to-end demo** on real captured items, not a mock-up.

### 2.2 Non-goals (for this hackathon)

- Native mobile apps beyond what the existing Capacitor build already provides.
- A full "anything" category library. Two categories is the proof.
- Multi-tenant accounts, billing or team features.
- Production-grade pricing, procurement or ordering flows.

### 2.3 Success criteria (proposed, to be validated against the eval set)

| Area | Criterion |
| --- | --- |
| Generalisation | A new category can be added through a schema definition without changing application code |
| Extraction quality | Field-level accuracy on the eval set is measured and reported for every model tested |
| Video | A recorded walk of a rack yields separate items, each with its own record |
| Benchmark | A published comparison of accuracy, latency and cost across Gemini, Muse Spark and one open-weights model |
| Demo | A judge understands the product in 30 seconds and sees real captures turn into records live |

## 3. Users and Demo Narrative

**Primary user: the trade fair buyer.** Walks a show floor, meets many vendors, works one-handed on a phone, in a noisy and crowded environment, and needs the catalogue to be ready when they get home.

**Demo narrative.**

1. Buyer photographs a vendor's business card or stall front. A vendor record is created.
2. Buyer photographs a fabric sample and its composition label. The label is translated and a fabric record is extracted.
3. Buyer switches the catalogue type to garments and walks a rack on video. Items are isolated and catalogued individually.
4. Buyer searches the catalogue. (Stretch goal: "find something like this" by image.)
5. A benchmark view shows how each model performed on the same captures.

## 4. Scope and Phasing

The ten days are indicative. Priorities: P0 is essential for the demo, P1 is strongly wanted, P2 is a stretch.

| Days | Theme | Outcome |
| --- | --- | --- |
| 1 | Foundation | API access confirmed, eval set assembled, task system and agents set up |
| 2 | Abstraction | Schema registry and model-provider interface in place |
| 3 to 4 | Muse Spark parity | Fabric extraction on Muse Spark matches current Gemini behaviour |
| 4 to 5 | Garments | Garment schema added through configuration only |
| 5 to 7 | Video and SAM | Modal endpoint segments items from video and returns extracted records |
| 7 to 8 | Benchmarks | Side-by-side evaluation across models, with results recorded |
| 8 to 9 | Stretch and polish | Visual search if time allows; UI polish; demo rehearsal |
| 10 | Submission | Demo recorded, write-up and submission complete |

## 5. Functional Requirements

### 5.1 Schema registry

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-SCH-01 | Catalogue types are defined as schemas (fields, types, allowed values, extraction hints) held as configuration | P0 |
| FR-SCH-02 | Fabric is expressed as a schema and behaves as it does today | P0 |
| FR-SCH-03 | Garment is added as a second schema with no application code changes | P0 |
| FR-SCH-04 | Schema versions are recorded on every extracted record | P1 |
| FR-SCH-05 | The capture UI adapts its fields and review screen to the active schema | P1 |

### 5.2 Capture and extraction

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-EXT-01 | Extract structured fields from a photo against the active schema using structured outputs | P0 |
| FR-EXT-02 | Translate composition and care labels into English as part of extraction | P0 |
| FR-EXT-03 | Capture vendor details from a business card or stall front photo | P0 |
| FR-EXT-04 | Let the buyer review and correct extracted fields before saving | P1 |
| FR-EXT-05 | Store the original capture alongside every record so the source is always traceable | P0 |
| FR-EXT-06 | Flag low-confidence or missing fields instead of guessing | P1 |

### 5.3 Video and item isolation

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-VID-01 | Accept a video capture of a rack, stand or display | P0 |
| FR-VID-02 | Isolate individual items in frame using SAM 3.1 | P0 |
| FR-VID-03 | Run extraction per isolated item and create one record each | P0 |
| FR-VID-04 | De-duplicate the same item appearing across multiple frames | P1 |
| FR-VID-05 | Process long videos asynchronously, writing results back to the catalogue when done | P0 |

### 5.4 Model providers and benchmarking

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-MOD-01 | Extraction sits behind a single provider interface: image and schema in, JSON out | P0 |
| FR-MOD-02 | Providers supported: Gemini (current), Muse Spark via Meta Model API, one Meta open-weights model on Modal | P0 |
| FR-MOD-03 | Provider can be switched by configuration, with a fallback provider on failure | P1 |
| FR-MOD-04 | A benchmark runner executes the same captures against every provider and records field-level accuracy, latency and cost | P0 |
| FR-MOD-05 | Benchmark results are viewable in the app or in a published write-up | P1 |

### 5.5 Catalogue and search

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CAT-01 | Organise records as Event → Vendor → Item → Variant | P0 |
| FR-CAT-02 | Filter and text search across fields | P1 |
| FR-CAT-03 | Visual search: find items similar to a photo the buyer provides | P2 |
| FR-CAT-04 | Export the catalogue to a spreadsheet | P2 |

## 6. Data Model (conceptual)

The relational database (Supabase Postgres) is the source of truth.

| Entity | Key attributes |
| --- | --- |
| Event | name, dates, location |
| Vendor | event, name, contact details, source capture (card or stall photo) |
| Catalogue type | name, schema definition, version |
| Item (style) | vendor, catalogue type, extracted fields, source captures, status |
| Variant | item, variant-level fields (for example colourway), source captures |
| Capture | type (photo or video), storage reference, timestamp, linked records |
| Extraction run | capture, provider, model, schema version, raw output, latency, cost |
| Benchmark run | eval set, provider, field-level scores, latency, cost |

Data principles: keep the raw capture and raw model output for every record, record which model and schema version produced each field, and never overwrite a buyer's correction with a re-extraction.

## 7. Technical Architecture (direction)

### 7.1 Logical layers

1. **Capture:** mobile-first React app (Capacitor, shadcn/ui, Tailwind) for photos and video.
2. **Orchestration:** Supabase Edge Functions receive captures, call the extraction layer and persist results.
3. **Extraction layer:** the model-provider interface with Gemini, Muse Spark and open-weights implementations.
4. **Heavy compute:** Modal web endpoints and jobs running SAM 3.1 and a Meta open-weights model on serverless GPUs.
5. **Storage:** Supabase Postgres and storage for records and original captures.
6. **Evaluation:** a benchmark runner executed as batch jobs on Modal.

### 7.2 Key flows

**Photo flow.** The app uploads the capture. An Edge Function calls the selected provider with the image and the active schema and saves the structured result.

**Video flow.** The Edge Function hands the job to a Modal endpoint, because a video job can outlast an Edge Function's timeout. Modal splits the video, isolates items with SAM 3.1, extracts each one against the schema and writes records back to Supabase. The app shows progress and results as they arrive.

### 7.3 Model usage

- **Muse Spark** through Meta Model API: multimodal image input and structured outputs; the API is OpenAI-SDK compatible, so integration is mainly base URL, key and model ID.
- **SAM 3.1:** item isolation from photos and video frames.
- **Meta open-weights model:** self-hosted on Modal as a cost and control comparison.
- **Gemini:** current baseline for the benchmark.
- **Muse Code:** trialled inside the build workflow and compared with the current agents.

## 8. Evaluation Plan

1. Assemble an eval set of real captures: composition tags in several languages, fabric swatches, garments on racks, business cards and stall fronts.
2. Hand-label ground truth for every field on the eval set.
3. Run each provider over the full set with identical schemas and prompts.
4. Score field-level accuracy, translation quality, latency and cost per item.
5. Record failure patterns (blur, glare, mixed languages, cluttered backgrounds) and whether SAM isolation improves results.
6. Publish the comparison and keep the fallback provider that the numbers support.

## 9. Build Workflow

The build reuses the existing multi-agent setup in Claude Code: a SQLite-backed task system with create, plan, claim and complete commands; a planning agent and a coding agent; a design-review agent that enforces the design system; and a Playwright agent for end-to-end testing. Muse Code is trialled alongside it and the comparison is noted for the write-up.

## 10. Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| Usability | One-handed, thumb-friendly capture; usable on a noisy, crowded show floor |
| Resilience | Poor connectivity on a show floor must not lose a capture; uploads queue and retry |
| Traceability | Every record links back to its source capture, model, and schema version |
| Cost control | Per-item model cost is tracked and visible in benchmarks |
| Privacy | Vendor contact details are stored only for the buyer who captured them |
| Security | Secrets held server-side; no model keys in the client |

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Meta Model API access is restricted by region (it was described as US-only at launch) | High | Confirm access from South Africa on day 1; fall back to open weights on Modal if unavailable |
| SAM 3.1 handles video differently than assumed | Medium | Check Meta's docs on day 1; fall back to frame-by-frame segmentation |
| Chosen open-weights model does not accept image input | Medium | Verify before committing; otherwise use it for text-only post-processing |
| Edge Function timeouts on video jobs | Medium | Hand jobs to Modal and write results back to Supabase |
| Scope creep toward "anything" | High | Two categories only; visual search is a stretch goal |
| Poor-quality captures (glare, blur, clutter) | Medium | Low-confidence flagging, buyer review step, SAM isolation |
| Eval set too small to be convincing | Medium | Start assembling real captures on day 1 |

## 12. Open Questions

1. Exact hackathon dates, judging criteria and submission format (demo video, repository, write-up).
2. Which Meta open-weights model to use, and does it accept images?
3. Does the Meta Model API work from South Africa, and what are the rate limits and costs?
4. How will the eval set be sourced? Existing captures, or new ones for garments?
5. Modal credit allocation and whether it covers GPU time for the benchmarks.
6. Does the demo run on a live app build or a recorded walkthrough?
7. Product name for the generalised engine: Snaplog, tagline "Snap it. Catalogued." Still to check: domain, app store and trademark availability.

## 13. Demo and Submission Checklist

- Working end-to-end flow on real captured items
- Fabric and garment catalogues shown from the same pipeline
- Video walk producing separate catalogued items
- Benchmark comparison across models
- Short recorded demo and written summary
- Clear statement of which Meta models and which Modal services were used
