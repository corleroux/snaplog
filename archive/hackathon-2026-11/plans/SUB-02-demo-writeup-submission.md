# SUB-02 — Demo video, write-up, submission

**Branch:** `task/sub-02-demo-submission` · **Priority:** P0 · **Effort:** ~4h + recording (Tue Nov 3, buffer Wed)
**Satisfies:** PRD §13 (Demo and Submission Checklist); the Demo (25%) and Impact (30%) rubric lines; event submission rules.

**Decision:** a recorded 3-minute demo (judges stop watching at 3:00), unlisted YouTube with anyone-with-link access, live product footage only — no slides. Script mapped to the rubric.

## Files

- `docs/DEMO-SCRIPT.md`: **0:00–0:30** hook — buyer pain, "Snap it. Catalogued."; one line on what existed before (fabric catalogue) vs built this week (must match SUB-01b's migration sentence verbatim). **0:30–1:15** fabric tag with a Chinese composition label → Muse Spark extraction + translation → review. **1:15–2:00** garment: show the schema INSERT (the "config, not code" moment) → capture → extract → commit. **2:00–2:35** rack-walk video → SAM isolation → items appear individually. **2:35–2:45** benchmark results (one table flash, numbers only). **2:45–3:00** "what's next" beat + close: at script-writing time (Tue), pull the top 1–2 entries from `docs/roadmap/` (currently R-01 vendor late binding + Unassigned inbox) and script ~15 seconds in forward-tense language only ("next, we're making vendor assignment optional at capture — nothing you snap is ever lost"); close on "Snap it. Catalogued."
- `docs/WRITEUP.md`: architecture (registry → provider interface → async video); which Meta models run where (Muse Spark Standard via Model API, SAM 3.1, Muse Spark Open on Modal); the benchmark table from FR-MOD-04; "Built with Muse Spark Open" attribution; Muse Code trial note (PRD §9); "What's next" section mirroring `docs/roadmap/` (same 1–2 items as the video beat, one paragraph each).
- Submission checklist: `snaplog-meta-hackathon` public and accessible; video link; team + Startup track on the CV platform; bonus opt-ins (open-weights build, agentic use-case); X post with the demo link for the viral bonus (engagement counts to Nov 8).
- Record Tue Nov 3; submit Wed Nov 4 well before 9 PM ET (04:00 SAST Thu).

## Acceptance

Video ≤ 3:00, opens with the before/this-week line (SUB-01b wording), closes with the what's-next beat sourced from `docs/roadmap/`, shows only event features; a fresh viewer can rebuild and run the product from the submission repo (SUB-01 acceptance); every checklist item ticked on the CV platform.

## Risks / verify first

Pre-stage demo data (vendor card, garment rack, rack-walk clip); record with the app on Standard mode; keep a backup screen-recording of the video pipeline in case live SAM is slow on the day; the what's-next beat must be verbally future-tense only — never show unbuilt UI or imply roadmap items exist; confirm the X post is up before Nov 8 EOD for the engagement count.
