# Brief: archive-hackathon-2026-11
## Problem
Hackathon-2026-11 artifacts live in docs/ alongside ongoing working docs; design_system.md (source of truth) is buried.
## Outcome
archive/hackathon-2026-11/ holds all moved hackathon artifacts; docs/ keeps only design_system.md and research/; both design_system.md brand references resolve under archive/.
## In scope
Move PRD.md, hackathon-status-update.md, WRITEUP.md, benchmark-results.md, DEMO-SCRIPT.md, Hackathon PRD Snaplog.md, plans/, demo-video/, feedback/, launch/, brand/, roadmap/README.md, assets/ → archive/hackathon-2026-11/; fix the 2 docs/brand/ references in design_system.md.
## Out of scope
design_system.md beyond the 2 references, docs/research/, code, contract, behaviour change.
## Assumptions
docs/feedback/ may be empty or absent; Hackathon PRD Snaplog.md source present per plan; :Zone.Identifier sidecar already deleted.
## Open questions
None.
## Proposed risk tier
R0 — docs move + two path reference edits, no behaviour change.
