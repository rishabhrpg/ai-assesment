# Spec — Support Ticket System (Core)

## User stories

1. As an internal agent, I create a ticket with title, description, priority, optional assignee, and implicit creator.
2. As an agent, I browse tickets, search by keyword, and filter by status.
3. As an agent, I open a ticket, edit fields, add comments, and advance status only through valid transitions.

## State machine

```
open          -> in_progress
in_progress   -> resolved
resolved      -> closed
open          -> cancelled
in_progress   -> cancelled
```

Invalid transitions: HTTP `409`, `code=INVALID_STATUS_TRANSITION`.

## API (summary)

- `GET /api/users`
- `GET /api/tickets?query=&status=`
- `GET /api/tickets/:id`
- `POST /api/tickets`
- `PATCH /api/tickets/:id`
- `POST /api/tickets/:id/comments`

## Data

SQLite tables: `users`, `tickets`, `comments` (see `data-model.md`).

## Done when

- README steps work on a clean machine.
- UI exercises happy paths + shows backend errors.
- `bun test tests/` passes.
