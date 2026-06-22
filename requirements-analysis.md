# Requirements analysis

## My understanding

We need a small internal **support ticket** app: users (seeded) create tickets with metadata, list and search them, update fields, add threaded-style comments, and advance **status** only along a fixed lifecycle. Invalid transitions must fail on the server and surface clearly in the UI. Persistence survives process restarts (SQLite file).

## Functional requirements (Core)

- CRUD-ish ticket operations: create, list, detail, update title/description/priority/assignee.
- Status changes only via allowed transitions.
- Comments on a ticket.
- Keyword search + filter by status on the list view.
- Seeded users; pick `createdBy` / assignee from those users (no auth in Core).

## Non-functional requirements

- Clear README and reproducible DB setup (migrate + seed).
- Consistent JSON error shape for API consumers.
- Automated tests proving state machine rules.
- Reasonable loading/empty/error UX on the frontend.

## Assumptions

- “User management UI” is out of scope; users exist only via seed.
- Acting user is chosen in the UI header (demo substitute for auth).
- Priority values: `low`, `medium`, `high`.

## Clarifications for a product owner

- Should `resolved` be reopenable to `in_progress`? **Guide says no** — only `resolved → closed` is valid from resolved.
- Should search be case-insensitive? **Implemented as case-insensitive** substring match.

## Edge cases

- Assignee optional (`null`).
- Invalid `status` filter query param returns `400`.
- Same-status PATCH is a no-op at the state-machine layer (allowed).
