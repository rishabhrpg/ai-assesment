# Database setup notes

## Database choice

**SQLite** — single-file database, no separate server process, suitable for local development and the Core assessment requirements.

## Setup instructions

1. Install dependencies: `bun install` (from repo root).
2. Copy environment template: `cp .env.example .env` (optional).
3. Apply schema: `bun run db:migrate`  
   - Creates `database/` if needed and applies [`schema-or-migrations/0001_init.sql`](schema-or-migrations/0001_init.sql).
4. Load sample users and tickets: `bun run db:seed`.

## Schema / migration location

- [`database/schema-or-migrations/0001_init.sql`](schema-or-migrations/0001_init.sql)

## Seed data

- Implemented in [`src/server/src/scripts/seed.ts`](../src/server/src/scripts/seed.ts) (not raw SQL files under `seed-data/`).
- Seeds three users (agents/customer) and two sample tickets with one comment.

## Environment variables

| Variable         | Purpose |
|------------------|---------|
| `DATABASE_PATH`  | Path to the SQLite file. Relative paths are resolved from the **repository root** when scripts run via `bun run`. |

## Steps to run locally

```bash
bun install
bun run db:migrate
bun run db:seed
bun run dev:server   # API
bun run dev:client   # UI (or use bun run dev for both)
```

To reset data: delete the SQLite file and re-run migrate + seed.
