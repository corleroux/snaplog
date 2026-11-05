# SUB-01b — Submission narrative (migration story)

**Branch:** none (direct edit in `snaplog-meta-hackathon`; the sync script never touches its README) · **Priority:** P0 (judges score what they can identify) · **Effort:** ~30 min
**Satisfies:** PRD §13; event rule "judges must be able to tell what's new"; Demo (25%) and Impact (30%) rubric lines.
**Depends on:** nothing. Do now.

## Problem

The submission README lists *"Provider interface (Gemini, Muse Spark, open weights)"* — three co-equal providers. It never states the migration. A judge skimming it cannot tell we moved the runtime off Gemini onto Meta models, which is half the before/this-week story the rules require.

## Changes (exact text, apply verbatim)

**1. Add a migration headline above the capability table:**

> The headline change: the extraction runtime moves off the pre-existing Gemini baseline onto Meta models — Muse Spark by default, Muse Spark Open as the open-weights comparison. Gemini remains only as recorded test fixtures and write-up context; it is never called at runtime.

**2. Reword the table row:**

> | Provider interface — runtime moved from Gemini to Muse Spark (+ open-weights leg) | In progress |

Leave the Model attribution table unchanged — it is already correct.

## Narrative standard (applies to README, video opener, write-up alike)

- One consistent sentence everywhere: *"extraction used to run on Gemini; this week we moved it behind a provider interface onto Muse Spark."* Same words in all three artifacts.
- Before/this-week framing is a disqualification shield, not decoration: before = fabric catalogue on Gemini (`snaplog@hackathon-baseline`); this week = schema registry, provider interface, garment-as-config, video, benchmark.
- Purpose line for any prose: Startup track, "Build for Your World" — a buyer at a trade fair points a phone at anything and gets a structured, searchable catalogue. Every paragraph must serve that buyer or the generalisation proof; nothing else.
- Never imply Gemini runs in the demo. "Baseline" always means fixtures/write-up-only.

## Acceptance

README contains the headline + reworded row; attribution table untouched; wording matches the demo opener in SUB-02. Architect signs off on wording (ping in session — 5 min review).
