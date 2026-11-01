# Snaplog — hackathon write-up (SUB-02, draft)

**Track:** Startup · **Theme:** "Build for Your World."
**One line:** a buyer at a trade fair points their phone at anything and gets a structured, searchable catalogue, starting with fabric and garments.

## The problem

A buyer meets dozens of vendors at a fair and comes home with a camera roll
they can't search, notebooks of vendor and product details, and a spreadsheet
to build by hand, matching every photo to the right note and the right item.

## The proof: a catalogue type is just a schema

Snaplog extends the existing fabric catalogue with garments — and the
garment category was added as a versioned schema definition, with no
application code changes. Fabric is one schema (composition, weight, weave,
colour). Garment is another (silhouette, construction, fabric used, sizing).
The structure stays the same: Event → Vendor → Item → Variant. The model
reads whatever the buyer captures against the schema that applies.

extraction used to run on Gemini; this week we moved it behind a
provider interface onto Muse Spark.

## Architecture

Capture → extract → review → explicit commit. AI assists, humans confirm:
extraction and commit are separate steps, and every transition preserves a
`raw_payload` → `normalised_payload` → `reviewed_payload` audit chain.

- **Schema registry** (`catalogue_types`): versioned schema definitions are
  configuration, not code. Every extracted record stamps its schema version.
- **Provider interface**: image(s) + schema in, structured JSON + usage out.
- **Video is asynchronous**: edge functions hand video jobs to Modal and
  return; SAM 3.1 isolates items; each crop comes back through the standard
  extract → review → commit path. The app never blocks on video.
- **Benchmark runner** executes the same captures against every provider and
  records field-level accuracy, latency and cost.

## Where Meta models run

| Capability | Model | Runtime |
|---|---|---|
| Photo extraction | Muse Spark via Meta Model API | Supabase Edge Function |
| Item isolation in video | SAM 3.1 | Modal (async jobs) |
| Open-weights comparison | Muse Spark Open | Modal shared endpoint |
| Baseline (fixtures / write-up only) | Gemini | — never called at runtime |

Built with **Muse Spark Open**.

## Benchmark

Same real captures, every provider, field-level accuracy plus latency and
cost per item. Method: normalised string/number match counts; null-vs-value
counted both ways, so the never-guess rule is rewarded. Exact string match is
a lower bound — wordier-correct extractions score as misses, and translation
quality is spot-checked manually per PRD §8.4.

| Provider | Captures (matched/scored) | Mean accuracy | Cost/item |
|---|---|---|---|---|
| gemini (legacy baseline) | 2 (53/53) | 100.0% | n/a |
| muse-spark 1.3 Standard | 3 (59/71) | 83.1% | ~$0.0050 |
| muse-spark-open | 2 (53/53) | 100.0% | ~$0.0025 |

*Dry-run numbers from recorded fixtures (no live models) — replaced by the
Tuesday live run over the full eval set. Full table: `docs/benchmark-results.md`.*

## Tooling note (PRD §9): Muse Code trial

*Status: pending owner input — do not publish empty claims.*
Planned comparison: the current multi-agent workflow (architect → builder,
reviewer, design-reviewer) against Muse Code on a like-for-like extraction
task, scored on parity of output, review findings caught, and wall-clock
time. Results land here before submission.

## What's next

**Vendor late binding (R-01).** On a show floor, forcing a vendor choice
before capture loses items — the exact failure Snaplog exists to prevent.
Capture stays free; the review step will require assigning to a vendor or
creating one, so nothing committed floats and nothing captured is lost.

**Unassigned inbox.** Stray vendor-less items live in a first-class inbox
with bulk assignment. Nothing you snap is ever lost.

## Submission checklist (owner, before Wed Nov 4 9PM ET)

- [ ] `snaplog-meta-hackathon` public and rebuildable from the README alone
- [ ] Demo video (≤3:00) recorded Tue, linked (unlisted, anyone-with-link)
- [ ] Team + Startup track on the CV platform; bonus opt-ins ticked
- [ ] X post with the demo link (engagement counts to Nov 8)
- [ ] Architect framing review of the demo script (migration narrative = SUB-01b verbatim)
- [ ] Secrets audit decision before making `snaplog` public
