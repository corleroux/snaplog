# Brief: category-library

## Problem
Snaplog is locked to fabric and garment catalogue types. Adding a new category requires code/config changes by a developer. The product vision is "point your phone at anything" — buyers need to define their own catalogue types (shoes, accessories, trim, etc.) without developer involvement.

## Outcome
A buyer can browse a library of catalogue types, add a new category by defining its schema through a UI (fields, types, allowed values), and immediately use it for capture — no code change required.

## In scope
- Catalogue type library UI (browse existing types)
- Create a new catalogue type via schema builder UI (name, fields, types, allowed values, extraction hints)
- Edit an existing catalogue type (versioned)
- Use a newly created type for capture immediately
- Delete an unused catalogue type (no items committed against it)

## Out of scope
- Pre-built category templates/marketplace (v1 is custom categories only)
- Sharing catalogue types between users/accounts (multi-tenant feature covers this)
- Import/export of schema definitions
- AI-suggested schemas (manual field definition only)

## Assumptions
- Any authenticated buyer can create catalogue types (no admin gate in v1)
- Catalogue types are scoped to the user/account (multi-tenant feature later makes this org-scoped)
- Schema builder produces valid registry-compatible schema definitions

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R1 — new UI + schema validation; writes to `catalogue_types` table (already exists from hackathon); no breaking change.
