# Criteria: archive-hackathon-2026-11
AC-01 [data] — Destinations exist
Given the archive move is complete
When archive/hackathon-2026-11/ is inspected
Then each destination exists at its new path: PRD.md, hackathon-status-update.md, WRITEUP.md, benchmark-results.md, DEMO-SCRIPT.md, plans/ (with FR-CAT-01-item-detail.md), demo-video/ (with BRIEF.md), launch/ (with 00-README.md), brand/ (with DESIGN-HANDOFF.md), roadmap/README.md, assets/ (with jacket-front.png)

AC-02 [data] — Sources gone, kept files untouched
Given the archive move is complete
When docs/ is inspected
Then no moved source path remains under docs/ (PRD.md, plans/, demo-video/, launch/, brand/, assets/, roadmap/README.md)
And docs/design_system.md and docs/research/ remain in place
And docs/design_system.md is unchanged apart from the two brand path references

AC-03 [data] — References resolve
Given docs/design_system.md
When it is read
Then both brand references point to archive/hackathon-2026-11/brand/snaplog-app-redesign.html and archive/hackathon-2026-11/brand/DESIGN-HANDOFF.md
And neither still references docs/brand/
