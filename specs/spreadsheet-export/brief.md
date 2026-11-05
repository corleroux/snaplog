# Brief: spreadsheet-export

## Problem
Buyers cannot export their catalogue data out of the app. After a fair they need to bring items into spreadsheets, share with vendors, or import into other tools. FR-CAT-04 was cut during the hackathon as a P2 stretch.

## Outcome
A buyer can export their event's catalogue items to a spreadsheet file (CSV) containing all extracted fields, vendor info, and source references.

## In scope
- Export all items for an event to CSV
- Include all extracted schema fields as columns
- Include vendor name and item status
- Export triggered by user action (button)
- Download file to device

## Out of scope
- Excel (.xlsx) format (CSV only)
- Export of images/media (data fields only)
- Scheduled/automatic exports (manual trigger only)
- Export across multiple events (one event at a time)
- Export with applied filters (export is all items in event)

## Assumptions
- CSV format (widely supported, no spreadsheet library dependency)
- Export includes all schema fields as dynamic columns
- Export is scoped to the current event

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R1 — additive export action; generates a file from existing data; no contract change.
