# UI flow

## Screens

1. **Ticket list (`/`)** — table-style list; search box; status filter; link to detail; link to create.
2. **New ticket (`/tickets/new`)** — form: title, description, priority, assignee; uses header “acting as” for `createdBy`.
3. **Ticket detail (`/tickets/:id`)** — shows status chip, allowed status actions, edit form, comments list + add comment.

## Navigation flow

```
List ──► Detail
 │  ╲
 │   ╲──► Create ──► Detail (after create)
 └──────── (header links)
```

## State handling

| State     | List                         | Detail                          |
|-----------|------------------------------|---------------------------------|
| Loading   | “Loading tickets…”           | “Loading ticket…”               |
| Empty     | dashed card + link to create | N/A (404 treated as error panel)|
| Error     | red alert banner             | red alert + back link           |
| Success   | ticket cards                 | forms + comments                |

## Key interactions

- **Search / filter:** controlled inputs; refetch on change (no debounce in Core — acceptable for small datasets).
- **Status buttons:** only show transitions allowed by `allowedNextStatuses` in the client (server remains authoritative).
- **Save edits:** PATCH fields without `status` unless using status buttons (separate calls).

## Wireframe notes

Optional: add screenshots to `pr-description.md` for reviewers.
