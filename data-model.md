# Data model

## Entity-relationship overview

- `users (1) ──< (N) tickets.created_by`
- `users (1) ──< (N) tickets.assigned_to` (nullable FK)
- `tickets (1) ──< (N) comments`
- `users (1) ──< (N) comments.created_by`

## Entities & fields

### `users`

| Column | Type    | Constraints |
|--------|---------|-------------|
| `id`   | INTEGER | PK, autoincrement |
| `name` | TEXT    | NOT NULL |
| `email`| TEXT    | NOT NULL, UNIQUE |
| `role` | TEXT    | NOT NULL |

### `tickets`

| Column        | Type    | Constraints |
|---------------|---------|---------------|
| `id`          | INTEGER | PK, autoincrement |
| `title`       | TEXT    | NOT NULL |
| `description` | TEXT    | NOT NULL |
| `priority`    | TEXT    | NOT NULL (`low` \| `medium` \| `high`) |
| `status`      | TEXT    | NOT NULL (see state machine) |
| `assigned_to` | INTEGER | FK → `users.id`, nullable |
| `created_by`  | INTEGER | NOT NULL FK → `users.id` |
| `created_at`  | INTEGER | NOT NULL (unix ms) |
| `updated_at`  | INTEGER | NOT NULL (unix ms) |

### `comments`

| Column       | Type    | Constraints |
|--------------|---------|-------------|
| `id`         | INTEGER | PK, autoincrement |
| `ticket_id`  | INTEGER | NOT NULL FK → `tickets.id` ON DELETE CASCADE |
| `message`    | TEXT    | NOT NULL |
| `created_by` | INTEGER | NOT NULL FK → `users.id` |
| `created_at` | INTEGER | NOT NULL (unix ms) |

## Indexes / constraints

- `users.email` UNIQUE
- Indexes: `tickets.status`, `tickets.assigned_to`, `comments.ticket_id`

## Status state machine

Stored as lowercase snake strings:

| Current        | Allowed next statuses |
|----------------|-----------------------|
| `open`         | `in_progress`, `cancelled` |
| `in_progress`  | `resolved`, `cancelled` |
| `resolved`     | `closed` |
| `closed`       | _(terminal)_ |
| `cancelled`    | _(terminal)_ |
