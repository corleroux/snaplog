# Brief: vendor-late-binding

## Problem
Buyers at trade fairs need to capture freely without being forced to pick a vendor first. Today the capture flow requires a vendor upfront; forced vendor-at-capture loses items — the exact failure Snaplog exists to prevent. No unassigned inbox exists, so vendor-less captures cannot be held and bulk-assigned later.

## Outcome
A buyer can capture photos/video with an event but no vendor; captured items land in a per-event unassigned inbox; the buyer can later assign each item to an existing vendor or create a new vendor and assign it; nothing captured is ever lost.

## In scope
- Capture proceeds with an event but no vendor (vendor optional at capture)
- Vendor-less items stored as unassigned within their event
- Per-event unassigned inbox listing vendor-less items
- Assign an inbox item to an existing vendor
- Create a new vendor from the inbox and assign an item to it
- Bulk assignment of multiple inbox items to one vendor
- Review step requires vendor selection or creation before commit

## Out of scope
- Capturing without an event (event is required)
- Global or cross-event inbox
- Multi-tenant accounts, billing, team features
- Visual search, spreadsheet export, filtering
- Editing vendor details beyond creation

## Assumptions
- An event must exist before capture can start
- A vendor can be absent at capture time and added later at review
- RLS permits vendor-less items scoped to the capturing user's event

## Open questions
None — both trade-offs resolved: per-event inbox, event required.

## Proposed risk tier
R1 — additive feature; vendor becomes optional at capture, new inbox and assignment flows, no breaking contract or data rewrite.
