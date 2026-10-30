# Verification Todo

## Resolutions Logged (with Verification)

- Q3 — resolved, and corroborated by docs: the Meta Model API is OpenAI-compatible at https://api.meta.ai/v1 with one Bearer key across models. Still missing for the FR-MOD-02 plan: the exact Muse Spark model ID, rate limits and pricing — my search surfaced the SAM and Glimmer pages but not the Muse Spark model ID.
- Q2 — verified: Muse Glimmer is a 30B dense multimodal model (text + image in, text out), Apache 2.0, on HF as meta-models/Muse-Glimmer-30B — bf16 (~60 GB, served via vLLM/SGLang) or GGUF quants (17–20 GB, fits a 24 GB GPU). One caveat for the Modal plan: the docs say "image support depends on the runtime" — the plan must smoke-test image input on the chosen runtime before building anything on top.
- Q5 — plan to spec, code regardless: live runs stay gated on credits arriving plus your explicit ask (per the safety rules). But see below — Q5's blast radius just shrank.

## New Verified Fact That Changes the Architecture

SAM 3.1 is served directly on the Meta Model API — model sam-3.1 over POST /v1/responses, same key, streaming recommended for video, @meta-sam/parser (TS + Python) decodes the mask grammar. Pricing: $2.50/1k images, $0.20/1k frames — a 60-second clip costs roughly $0.36. My recommendation: call SAM via the API rather than self-hosting it on Modal; Modal remains the async orchestrator, the Muse Glimmer host and the benchmark runner. Bonus: SAM returns stable object identities across frames, so FR-VID-04 (dedupe) largely comes free. I'll encode this in the FR-VID plan unless you object — it revises the PRD's "Modal runs SAM 3.1" assumption, which the PRD's own risk table anticipated ("check Meta's docs on day 1").

## The Deadline Changes Everything

Nov 4, 09:00 EST = 16:00 SAST Wednesday. Today is Friday Oct 30 — that's ~5 build days, not the PRD's 10. So I'm applying the cut order now, not later:
- Out immediately: FR-CAT-03, FR-CAT-04 (P2).
- P1 triage: keep FR-SCH-04 (rides along with FR-MOD-01's run columns plus one stamp in the commit path), FR-SCH-05 minimal (demo step 3 needs the category switch), FR-EXT-06 minimal. Cut FR-MOD-03, the FR-MOD-05 in-app view (the requirement's own wording — "in the app or in a published write-up" — is satisfied by the write-up), FR-CAT-02 (existing fulltext search suffices), FR-VID-04 (SAM identities cover it).
- Never cut: the P0 demo flow.

### Compressed Sequence

Fri registry + eval-set start → Sat provider interface + garment shoot → Sun Muse Spark provider + garment schema/storage (Modal drop-dead #1) → Mon video pipeline + category switch (drop-dead #2) → Tue benchmark run, write-up, record the 3-minute demo → Wed submit. That's ~45h of estimated work in 5 days — feasible only with the cuts pre-applied and the agent crew saturated.

## Q4 — Eval Set (My Recommendation)

Hybrid sourcing, written up as docs/plans/FR-MOD-04-eval-set.md: read-only export of existing production captures for the fabric/vendor classes (real trade-fair data, zero capture cost, already multi-language), fresh shots only for what's genuinely new — garments and the rack-walk video — ~50 items hand-labeled against the schemas. It traces to FR-MOD-04's "same captures" input and PRD §8 steps 1–2; it is not a standalone FR, and the plan says so.

## What I Still Need from You

1. Build hours/day, Oct 30–Nov 3, and whether agent runs can go overnight — this decides whether any P1 survives.
  - Agent can run overnight. Maximize build hours / day
2. Judging rubric + submission venue/link + required mentions (Meta/Modal attribution is already in the PRD checklist). Needed by Tuesday for the video script.
  - See the file `Event Details.md`
3. Confirmation that nothing exists from "days 1–5" outside this repo — the repo shows no FR work yet; if you have API probing notes or anything else, share it.
  - What are you looking for specifically?
4. Muse Spark specifics for FR-MOD-02: exact model ID string, a working sample call, rate limits, pricing.
  - See the file `Event Details.md`
5. Modal credits ETA + who sets the tokens. Proposed drop-deads: Sun Nov 1 EOD to plan Glimmer into the benchmark; Mon Nov 2 EOD for any live run. After that, the benchmark publishes Gemini vs Muse Spark and Glimmer ships code-complete-but-unrun.
  - Modal credits ETA unconfirmed at this stage
6. PII call: may existing real vendor business cards go into the eval set — and on camera in the recorded demo — or do we shoot fresh/redacted?
  - See the file `Event Details.md`
7. Physical access: a garment rack + phone this weekend for the fresh captures and rack-walk video (feeds both the eval set and the demo footage).
  - This will be supplied.
