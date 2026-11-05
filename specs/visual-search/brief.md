# Brief: visual-search

## Problem
Buyers cannot find items by visual similarity. They may remember what an item looked like but not its vendor, composition, or name. FR-CAT-03 is a stretch goal (P2) — lowest priority.

## Outcome
A buyer can provide a reference photo and the app returns catalogue items visually similar to it, ranked by similarity, within the current event.

## In scope
- Buyer selects a reference photo (from camera or gallery)
- System returns visually similar items from the current event's catalogue
- Results ranked by similarity score
- Buyer can tap a result to open the item detail

## Out of scope
- Search across events (scoped to current event)
- Search against un-committed/draft captures (committed items only)
- Exact-duplicate detection (similarity, not identity)
- Real-time/live camera similarity search (photo selection only)

## Assumptions
- Visual similarity is computed on committed item images (source captures)
- Results are scoped to the current event
- Similarity ranking is approximate (good enough, not exact)

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R1 — read-only similarity search; depends on an image-embedding/search capability that does not exist yet (new dependency).
