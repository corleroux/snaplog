# Brief: multi-tenancy

## Problem
Snaplog is single-user/single-context today. Buyers at companies need their data separated from other buyers, with a shared organisation context (shared vendors, shared catalogue types, shared events). This is a new requirement set — multi-tenancy was an explicit hackathon non-goal.

## Outcome
Buyers belong to organisations; data (events, vendors, items, catalogue types) is scoped to an organisation; organisation members see each other's data within the org but not other orgs' data.

## In scope
- Organisation creation and joining (via invite)
- User membership in one or more organisations
- All data scoped to an organisation (events, vendors, items, catalogue types)
- Organisation context selector (switch between organisations)
- RLS enforcing organisation-level data isolation

## Out of scope
- Public sharing between organisations
- Organisation hierarchy (parent/child orgs)
- Single sign-on (SAML/OIDC) — covered by user-accounts
- Organisation billing plans — covered by billing

## Assumptions
- An organisation is created by the first user (owner)
- Users join via email invitation from an organisation admin
- A user's personal data (profile, settings) is separate from organisation data

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R2 — touches auth, RLS, and data model (organisation_id on all tables); data isolation is security-critical; human approval required before merge regardless of dial.
