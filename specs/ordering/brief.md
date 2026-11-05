# Brief: ordering

## Problem
Buyers using Snaplog as their catalogue cannot take orders from their own customers. There is no cart, checkout, or order record — the app is capture-only. Ordering completes the commercial loop: buyers can sell what they've catalogued.

## Outcome
A buyer's customers can browse the catalogue, add items to a cart, and place an order; the buyer receives and manages orders (new, paid, fulfilled, cancelled).

## In scope
- Customer-facing product browse (public catalogue view)
- Add items to cart (with variant and quantity)
- Checkout (customer details, order confirmation)
- Order creation and status tracking (new → paid → fulfilled → cancelled)
- Buyer view of all orders with status

## Out of scope
- Payment processing at checkout (orders are recorded; payment is external — covered by billing)
- Shipping/fulfilment integration
- Order emails/notifications
- Customer accounts (guest checkout only v1)

## Assumptions
- Ordering is via a public catalogue view (no customer login required v1)
- Orders are recorded in the app; payment is handled externally
- Cart is session-based (no persistent cart without account)

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R1 — additive order data; new orders/order_items tables; public read surface; no breaking change.
