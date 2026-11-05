# Brief: procurement

## Problem
Buyers cannot turn catalogue items into purchase orders or request quotes from vendors. After finding items at a fair, they need to send purchase orders to vendors and track ordering.

## Outcome
A buyer can create a purchase order from catalogue items, send it to a vendor (quote request), and track the order status (draft, sent, quoted, ordered, received, cancelled).

## In scope
- Create a purchase order from selected catalogue items
- Add quantities per item variant
- Send PO to a vendor (mark as sent)
- Track PO status lifecycle
- Record received quantities against a PO
- View PO history per vendor

## Out of scope
- Vendor quotes/bidding (vendor sends back pricing — v1 is buyer-initiated)
- Receiving/inspection workflows beyond quantity received
- Integration with accounting/ERP systems
- Automated reordering

## Assumptions
- Purchase orders are buyer-initiated (vendor does not create POs)
- PO status is a simple lifecycle (draft → sent → ordered → received → cancelled)
- Quantities are at variant level

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R1 — additive order data; new purchase_order tables; no breaking change to existing data.
