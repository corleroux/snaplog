# Snaplog Roadmap — POST-HACKATHON ONLY

> **⛔ DO NOT BUILD. NOT A BACKLOG. READ THIS FIRST.**
>
> Everything in this folder is parked future work for discussion between the
> owner and the architect **after the hackathon** (deadline Wed Nov 4 9PM ET).
> **The build team must NOT action, plan, branch, or partially implement any
> item here as part of the hackathon.** No roadmap entry traces to a hackathon
> FR, carries no branch, no wave, no acceptance check. If an item is ever
> promoted to real work, that happens via a proper `docs/plans/<FR-ID>-*.md`
> plan written at the time — never by lifting text from this folder.
>
> The only hackathon-permitted use of this folder: the demo video and write-up
> may reference entries as *"what's next"* narrative, to show judges the product
> has a future. Words on camera, never code on branches.

---

## R-01 — Vendor late binding (enforce at commit, not at capture)

**Status:** DEFERRED — do not build during the hackathon. (Agreed Sun Nov 1.)

### Context

Today the extract edge functions require `vendor_id` up front and throw without
it, so a buyer who hasn't entered through a vendor page cannot capture an
item. On a show floor that means lost captures — the exact failure the product
exists to prevent. The scripted demo always carries vendor context, so current
enforcement never bites on camera; that is why this waits.

### Settled direction (post-hackathon)

- **Occasion (Event): always required, zero taps.** Default to the active
  event. Every item stays findable by trip at no cost to the buyer.
- **Vendor: required by commit, not by capture.** Capture freely → extract →
  review forces assign-to-vendor-or-create before commit. Nothing committed
  floats, nothing captured is lost.
- **Unassigned inbox:** stray vendor-less items live in a first-class inbox
  with bulk assignment. "Nothing you snapped is ever lost" is the narrative
  payoff — bank it for the write-up's *"what's next"* section and possibly one
  demo closing line.
- **Pre-capture vendor picker: rejected.** A decision tap before any value is
  delivered, redundant when entering from a vendor page, and blind where a
  post-extraction suggestion would be smart. Late binding dominates it.

### Why this is cheap later: the database already agrees

- `scan_sessions.vendor_id` is **nullable** — captures without vendors are
  already representable.
- `fabric_styles.vendor_id` is **NOT NULL** — committed records already cannot
  float. The commit gate is the right enforcement point and half-exists.
- Remaining work is edge-function nullability plus review UI, not a remodel.

### If built, the work looks like this (estimate ~6–8h, re-plan at the time)

1. Extract functions (`extract-fabric-document`, `extract-catalogue-item`,
   `extract-isolated-item`) accept null `vendor_id`; skip UUID validation when
   null. Video item sessions inherit parent vendor, null or not.
2. Rework the commit match-check into a one-way ratchet: null→value allowed,
   value→different-value still 409. (Currently null session + chosen vendor
   would false-conflict.)
3. Commit functions keep requiring `vendor_id` — enforcement moves here
   exclusively. Client zod schemas make it optional at extract, required at
   commit.
4. Review screen: blocking assign-or-create vendor step before commit.
   New Unassigned inbox with bulk assignment.
5. Invert the edge tests asserting 500-on-missing-vendor; update e2e mocks.
6. Watch-outs: `unique(vendor_id, item_code)` goes blind on NULLs (Postgres
   treats them as distinct) — assume unassigned rows can collide pre-commit.
   RLS is unaffected (event-scoped).

### Forward-compat note for the hackathon build team (READ-ONLY, not a task)

If `extract-catalogue-item` or `extract-isolated-item` are touched before this
resolves: accepting a nullable vendor in new code costs nothing extra at
birth — let commit enforce. Retrofitting nullability later is where the hours
live. This is guidance for code already being written, not permission to build
R-01.

---

## R-02 — Per-agent memory (isolated files, not shared)

**Status:** DEFERRED — POST-SUBMISSION ONLY. Do not build during the hackathon.

### Context

OpenCode V2 has no built-in persistent memory: sessions are isolated, subagents start with fresh context, compaction is a lossy same-session summary. Current agents (`.opencode/agents/*.md`) have no memory mechanism. Shared knowledge lives in `AGENTS.md` — this entry is explicitly **per-agent** memory only, so `builder`/`reviewer`/`inference`/`tester`/`design-reviewer`/`architect` can retain their own learnings without polluting shared context.

### Settled direction (post-hackathon)

- **Recommendation: one file per agent** at `.opencode/memory/<agent-id>.md` (e.g. `builder.md`, `reviewer.md`), read at session start and appended at session end per that agent's system prompt. Reason: only V2-native way to get isolation without new infra that survives compaction/sessions.
- Each agent gets `edit: allow` on its own memory file only, `deny` on others' — prevents cross-talk.
- `AGENTS.md` stays the shared contract; memory files stay private working notes. Cap files (~50 lines, prune rule) so they don't bloat context.
- Alternative considered and rejected: single shared `MEMORY.md` — rejected per owner decision, causes cross-talk and bloats every session.

### Why deferred

No FR trace (not `FR-SCH/EXT/VID/MOD/CAT`), so no `docs/plans/` file permitted. P0/P1 + demo critical path (`FR-MOD-01 → FR-MOD-02a → FR-VID → benchmark → submit`, deadline Wed Nov 4 9PM ET) is unfinished. Editing 6 agent configs mid-hackathon invalidates ⓪ alignment work.

### If built, the work looks like this (estimate ~3h, re-plan at the time)

1. Create `.opencode/memory/` + stub file per agent.
2. Add 2-line read/update rule to each agent's system prompt.
3. Scope edit permissions per agent to own file.
4. Watch-outs: compaction drops in-memory updates (must persist before end), concurrent subagent writes, never paste vendor-card PII into contributor-mode memory.

## R-02 — Store listing assets + first-run onboarding (post-distribution decision)

**Status:** PARKED — needs the final UI first; earliest start is after the OpenDesign output is implemented. (Agreed Sun Nov 1.)

### Context

Pre-submission these are impossible or valueless: store screenshots can only depict final, implemented UI (which won't exist until ⑨ lands in the new language), no store listing is part of the hackathon submission, and in-app onboarding has no FR and would steal seconds from a 3-minute scripted demo. The one legitimate pre-submission slice — an installable-looking app icon/splash — is already covered by Stream A of DESIGN-01.

### Settled direction (post-hackathon)

- **Trigger:** only once a real distribution decision is made (TestFlight / Play testing track or full store listing). No decision, no work — screenshots for stores you aren't listing on are throwaway.
- **Store assets:** screenshot sets per store spec (portrait, actual device frames, final UI only), feature graphic, short + full description copy, keywords. All captured from the implemented app, never mocked — stores reject misleading screenshots and judges-grade honesty applies to users too.
- **In-app onboarding:** first-run carousel (3 slides max: snap → review → catalogue), skippable in one tap, never shown again, never in the demo path. Scope: strictly the existing capture→review→commit flow — onboarding must not become a vehicle for unbuilt features.
- **Sequencing:** R-02 starts after the OpenDesign language is implemented (it needs final UI) and is independent of R-01 (vendor late binding); either order works.

### If built, the work looks like this (estimate ~1 day, re-plan at the time)

1. Implement final UI in OpenDesign language (precondition, not part of R-02).
2. Capture store screenshots from production builds on real device frames.
3. Write listing copy (short/full/long, keywords) consistent with the SUB-01b migration narrative.
4. Build the 3-slide onboarding flow + "don't show again" persistence; design-reviewer pass for first-run clarity.
5. Internal test track first (TestFlight / Play internal), public listing only after a clean internal week.

---

## How to add entries here

One `R-NN` section per idea: Context → Settled direction (or open questions) →
Why deferred → Sketch of the work + estimate. No branches, no waves, no
acceptance checks — the moment an entry needs those, it stops being roadmap
and needs an architect plan instead.
