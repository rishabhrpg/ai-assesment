# Support Ticket Management System

Internal support ticket tracker with role-based authentication: create tickets, assign users, comment, search, filter by status, and move tickets through a strict status lifecycle enforced on the server. Features multi-role access control (admin, manager, agent, customer) with session-based authentication.

## Tech stack

- **Runtime / API:** [Bun](https://bun.sh) with [Hono](https://hono.dev)
- **Persistence:** SQLite (file-based) with SQL migrations
- **ORM / queries:** Drizzle ORM
- **Validation:** Zod (API request bodies and query rules)
- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, React Router 7

## Prerequisites

- [Bun](https://bun.sh) 1.1+ installed

## Setup

From the repository root:

```bash
bun install
cp .env.example .env
bun run db:migrate
bun run db:seed
```

Optional: edit `.env` to change `DATABASE_PATH` or `PORT`.

## Running the app

**Option A — both processes (recommended):**

```bash
bun run dev
```

This starts the API (default `http://localhost:3000`) and the Vite dev server (`http://localhost:5173`). Open the Vite URL in a browser. The client proxies `/api` to the API.

**Option B — two terminals:**

```bash
bun run dev:server
bun run dev:client
```

## Running tests

```bash
bun test tests/
```

Integration tests cover the ticket **status state machine** via the HTTP API (valid transitions succeed; invalid transitions return `409` with `INVALID_STATUS_TRANSITION`).

## Environment variables

| Variable         | Description                          | Default                |
|-----------------|--------------------------------------|------------------------|
| `DATABASE_PATH` | SQLite file path (relative or abs)   | `./database/data.db`   |
| `PORT`          | API listen port                      | `3000`                 |

## Folder structure (high level)

| Path | Purpose |
|------|---------|
| [`src/server`](src/server) | Hono API, Drizzle schema, migrations runner, seed script |
| [`src/client`](src/client) | React SPA (Vite + Tailwind) |
| [`database/schema-or-migrations`](database/schema-or-migrations) | Versioned SQL schema |
| [`database/seed-data`](database/seed-data) | Reference / notes (seed executed via script) |
| [`tests`](tests) | Automated tests (state machine integration) |
| [`ai-prompts`](ai-prompts) | Curated AI prompt history for assessment |
| [`tool-specific/cursor-workflow`](tool-specific/cursor-workflow) | Cursor-specific workflow artifacts |

Lifecycle documentation (`requirements-analysis.md`, `design-notes.md`, etc.) lives at the repository root per the assessment guide.

## Production build (client)

```bash
cd src/client && bun run build
```

Serve `src/client/dist` with any static host; configure it to reverse-proxy `/api` to the Bun API, or set equivalent CORS and API URL as needed.

## Security note

There is **no authentication** in the Core build (per assessment scope). The UI lets you pick an “acting as” seeded user for `createdBy` / comments. Do not expose this app to the public internet without adding auth and authorization.

## Authentication & Authorization

The application includes full authentication and role-based access control:

### Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full access to all tickets, users, and system management |
| **manager** | Can read/create/update all tickets, assign tickets to agents |
| **agent** | Can read/create tickets, update assigned tickets |
| **customer** | Can only view and manage their own tickets |

### Demo Accounts

After seeding, the following accounts are available (all passwords: `password123`):

| Email | Role |
|-------|------|
| `admin@example.com` | admin |
| `mike@example.com` | manager |
| `alice@example.com` | agent |
| `bob@example.com` | agent |
| `carol@example.com` | customer |

### Protected Routes

- All application routes require authentication
- Login page is at `/login`
- Sessions are managed via HTTP-only cookies
- API endpoints enforce role-based permissions
