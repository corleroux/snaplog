# Brief: team-management

## Problem
Organisations need to manage who can access what. Buyers need to add teammates, assign roles (admin, member, viewer), and control what each person can do (capture, edit, export, manage organisation).

## Outcome
Organisation admins can invite teammates, assign roles, and remove members; role-based permissions control what each member can do within the organisation.

## In scope
- Invite teammates to an organisation
- Assign roles (owner, admin, member, viewer)
- Role-based permissions (capture, edit items, export, manage organisation, manage billing)
- Remove members from an organisation
- View organisation members and their roles

## Out of scope
- Custom role creation (fixed roles only)
- Permission inheritance from teams/groups
- Approval workflows for member actions
- Organisation-level admin delegation beyond owner/admin

## Assumptions
- Four fixed roles: owner, admin, member, viewer
- Owner is the organisation creator (cannot be removed)
- Permissions are role-based, not per-resource (v1)

## Open questions
None — assumptions made per user directive to carry on.

## Proposed risk tier
R2 — touches auth/authorisation and data access; security-critical; human approval required before merge regardless of dial.
