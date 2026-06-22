# Acceptance criteria

## Core application

- [x] Create ticket via UI with validation feedback.
- [x] List tickets from database with loading/empty/error states.
- [x] Ticket detail view with edit form and comments.
- [x] Update title, description, priority, assignee.
- [x] Status transitions enforced; invalid transitions rejected with `409` and readable message in UI.
- [x] Keyword search and status filter on list.
- [x] Data persists across API restarts (SQLite file).
- [x] Backend rejects invalid payloads (Zod) with `400` + structured errors.

## Testing

- [x] Integration tests for state machine via HTTP (`bun test tests/`).

## Documentation

- [x] README with setup, run, test, env vars, structure.
- [x] Prompt history under `ai-prompts/`.
- [x] Lifecycle docs at repo root per guide.

## Validation & error handling

- [x] API: `{ error: { code, message, details? } }` for failures.
- [x] UI: displays API error messages on forms and status actions.

## Non-goals (Core)

- Authentication / RBAC (Stretch only).
