# Brief: catalogue-pricing

## Problem
Snaplog records items but has no pricing attached to variants. Buyers need to track cost/price per item variant (e.g. fabric by the metre, garment by size) for procurement and ordering.

## Outcome
Each catalogue item variant can have a price (and optional cost) attached, with currency, effective dates, and the ability to view pricing on item detail.

## In scope
- Price per variant (amount, currency, effective date)
- Optional cost per variant (buyer's cost vs. selling price)
- Price history (superseded prices retained)
- Price shown on item detail screen
- Bulk price update for variants

## Out of scope
- Dynamic pricing / discounts / promotions
- Tax-inclusive vs exclusive configuration — prices are stored as-is
- Multi-currency support (single currency per organisation — covered later)
- Pricing rules engines

## Assumptions
- Price is attached to the variant level (not item level)
- One active price per variant at a time (effective-dated)
- Currency is per-organisation (single currency v1)

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R1 — additive pricing data on variants; reads/writes to new price fields; no contract rewrite (additive columns).
