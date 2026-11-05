# Brief: user-accounts

## Problem
Snaplog today has no user registration or identity beyond the hackathon's implicit single-user model. Buyers need accounts to own their data, log in across devices, and belong to organisations (multi-tenancy).

## Outcome
A buyer can register, log in, manage their profile, and authenticate across devices; their identity is the basis for data ownership and organisation membership.

## In scope
- Email/password registration and login
- Password reset (email-based)
- Profile management (name, avatar, contact details)
- Logout and session management
- Identity links data ownership (captured items belong to the logged-in user)

## Out of scope
- Social login (Google/Apple) — v1 is email/password only
- Single sign-on (SAML/OIDC) — covered by multi-tenancy/billing
- Two-factor authentication
- Account deletion (GDPR right to erasure — later)

## Assumptions
- Supabase Auth provides the authentication backend
- Registration requires email verification
- A user can exist without an organisation (personal context)

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R2 — touches auth and authentication; security-critical; human approval required before merge regardless of dial.
