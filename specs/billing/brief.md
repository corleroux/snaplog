# Brief: billing

## Problem
Snaplog has no billing or subscription model. To operate as a business, the app needs pricing plans, subscription management, and payment processing for organisations and individual buyers.

## Outcome
An organisation or buyer can subscribe to a pricing plan, manage their subscription (upgrade/downgrade/cancel), and invoices are generated; paid features are gated by subscription tier.

## In scope
- Pricing plans (free, paid tiers) with defined limits
- Subscription creation and payment via a payment provider
- Subscription management (upgrade, downgrade, cancel)
- Invoice generation and payment history
- Feature gating based on subscription tier (e.g. number of items, events)

## Out of scope
- One-time purchases / a la carte pricing
- Tax calculation and invoicing compliance (VAT/GST) — later
- Multiple payment providers
- Refunds and disputes — handled by payment provider

## Assumptions
- A third-party payment provider (Stripe or similar) handles payments
- Pricing plans are configured by the product team (not buyer-defined)
- Free tier exists for individuals/hobbyists

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R2 — touches spend/billing, payment provider integration; financial and security-critical; human approval required before merge regardless of dial.
