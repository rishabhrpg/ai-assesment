# Project context (Cursor)

## Product

Support Ticket Management System — **Core** build for an AI-assisted engineering assessment.

## Non-negotiables from the guide

- Entities: `User` (seed only), `Ticket`, `Comment`.
- Mandatory **status state machine** enforced on the **server** with clear UI errors.
- SQLite acceptable; must include migrations + seed + README instructions.
- At least one meaningful **integration** test tier proving state machine rules.
- Full lifecycle documentation + `ai-prompts/` history.

## Stack decisions

- **Backend:** Bun runtime, Hono framework, Drizzle ORM, Zod validation, `bun:sqlite`.
- **Frontend:** React + TypeScript + Vite + Tailwind v4 + React Router 7.
- **Dev UX:** Vite proxies `/api` → `http://localhost:3000`.

## Repository entry points

- Server entry: `src/server/src/index.ts`
- Client entry: `src/client/src/main.tsx`
- API mounted at `/api/*` (see `src/server/src/app.ts`)
- Tests: `tests/status-machine.integration.test.ts`

## Conventions

- API errors: `{ error: { code, message, details? } }`.
- Status string values: `open`, `in_progress`, `resolved`, `closed`, `cancelled`.
- Timestamps: unix milliseconds (`integer` columns).

## Out of scope (unless Stretch)

- Authentication, user CRUD, OpenAPI, Docker/CI.
