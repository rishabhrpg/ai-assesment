# Test strategy

## Scope

- **Core mandatory:** integration tests proving ticket status transition rules through the real HTTP API and SQLite persistence.
- **Stretch (not implemented here):** unit tests for pure helpers, component tests, broader failure matrices.

## Levels

| Level        | Coverage |
|--------------|----------|
| Integration| `tests/status-machine.integration.test.ts` — Hono `app.request`, temp SQLite DB, seeded user + ticket per test. |
| Unit         | Not required for Core beyond what integration covers. |
| Component/E2E| Out of scope for this repo’s minimal Core. |

## Edge cases covered in integration tests

- Happy path `open → in_progress`
- Illegal `open → closed` (`409`)
- Full chain `open → in_progress → resolved → closed` then illegal reopen `→ open`
- `open → cancelled`
- Illegal `resolved → cancelled`

## Not covered (explicit)

- UI/React component tests.
- Concurrent update races.
- Full CRUD matrix for comments and field edits (covered manually / future work).
