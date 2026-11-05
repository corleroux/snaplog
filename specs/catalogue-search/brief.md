# Brief: catalogue-search

## Problem
Buyers cannot filter or text-search their catalogue. After a fair with dozens of vendors and hundreds of items, finding a specific fabric, garment, or vendor requires manual scrolling. FR-CAT-02 was cut during the hackathon to protect the P0 demo flow.

## Outcome
A buyer can filter catalogue items by schema fields (e.g. composition, garment type, colour) and text-search across item fields and vendor names, within the current event, and see matching results immediately.

## In scope
- Text search across catalogue item fields and vendor names
- Filter by catalogue-type schema fields (dropdown/multi-select per field type)
- Filter by vendor
- Filter by item status (e.g. reviewed, unassigned)
- Search + filters combine (AND)
- Results count and empty state when no matches

## Out of scope
- Saved filter presets (exists in `filters` feature — out of scope here)
- Global/cross-event search (event-scoped only)
- Visual/image search (separate feature: visual-search)
- Search across capture metadata (dates, storage paths)

## Assumptions
- Search is scoped to the current event (buyer is at one fair)
- Search matches against extracted item field values and vendor name
- Filters are derived from the active catalogue type's schema

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R1 — additive read-only search/filter UI over existing data; no contract change.
