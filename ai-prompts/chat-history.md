# Chat History — Prompt Log

> These are the actual prompts used with Cursor (AI agent mode) across the full build of the Support Ticket Management System. Prompts are ordered chronologically and grouped by phase. Responses are not included here — see the relevant `ai-prompts/` category files for response summaries and accept/reject decisions.

---

## Prompt 1 — Project bootstrap & context setup

```
You are helping me build a Support Ticket Management System for an internal engineering assessment.

Here is the exact scope. Read it carefully before generating anything:

**Stack (non-negotiable):**
- Backend: Bun runtime, Hono framework, Drizzle ORM, bun:sqlite, Zod validation
- Frontend: React 19, TypeScript, Vite 6, Tailwind CSS v4, React Router 7
- Database: SQLite (file-based, migrations via hand-written SQL, no drizzle-kit)
- Tests: Bun's built-in test runner (`bun test`)

**Repository layout (match this exactly — do not add extra wrapper folders):**
```
ai-assesment/          ← repo root
  README.md
  .env.example
  .gitignore
  package.json         ← Bun workspaces root: ["src/server", "src/client"]
  src/
    server/            ← Hono API workspace
    client/            ← Vite React workspace
  database/
    schema-or-migrations/
    seed-data/
    setup-notes.md
  tests/               ← integration tests (bun test)
  ai-prompts/
  tool-specific/cursor-workflow/
```

**Core entities:**
- User: id, name, email, role — seeded only, no user management UI
- Ticket: id, title, description, priority (low|medium|high), status, assigned_to (FK→users nullable), created_by (FK→users), created_at (unix ms), updated_at (unix ms)
- Comment: id, ticket_id (FK→tickets, ON DELETE CASCADE), message, created_by (FK→users), created_at (unix ms)

**Status state machine (enforce on the server, not just the client):**
open        → in_progress, cancelled
in_progress → resolved, cancelled
resolved    → closed
closed      → (terminal)
cancelled   → (terminal)

Invalid transitions must return HTTP 409 with body: { "error": { "code": "INVALID_STATUS_TRANSITION", "message": "..." } }

**All API errors use this envelope:**
{ "error": { "code": "STRING", "message": "human readable", "details"?: {} } }

**Task for this prompt:**
1. Scaffold the full repository skeleton: package.json files (root + server + client), tsconfig files, vite.config.ts with /api proxy to localhost:3000, .env.example, .gitignore.
2. Create src/server/src/index.ts that boots Hono on Bun's serve(), reads PORT from env.
3. Create a GET /health endpoint returning { ok: true }.
4. Do NOT implement any routes or DB logic yet — just a working server that starts.

Show me the exact files and their full contents. Do not summarise — write everything out.
```

---

## Prompt 2 — Database schema, migration runner, Drizzle client

```
Context: We have the Hono server scaffolded (src/server/src/index.ts, package.json, tsconfig.json). Now add the database layer.

Files I already have:
- src/server/src/index.ts  (boots Hono, GET /health)
- database/ directory exists

Task:
1. Write database/schema-or-migrations/0001_init.sql with:
   - CREATE TABLE IF NOT EXISTS for: users, tickets, comments
   - Correct FK constraints (REFERENCES, ON DELETE CASCADE for comments→tickets)
   - Indexes on tickets.status, tickets.assigned_to, comments.ticket_id
   - Use INTEGER for unix-ms timestamps, not TEXT

2. Write src/server/src/db/schema.ts using drizzle-orm/sqlite-core:
   - Mirror the SQL exactly (same column names, same types)
   - Export TypeScript types: User, Ticket, Comment (using $inferSelect)
   - No Drizzle relations (keep simple for bun:sqlite)

3. Write src/server/src/db/client.ts:
   - Accepts a string path argument
   - Opens bun:sqlite Database, enables PRAGMA foreign_keys = ON
   - Returns drizzle(sqlite, { schema }) — export type Db = ReturnType<typeof createDb>

4. Write src/server/src/scripts/migrate.ts:
   - Reads all *.sql files from database/schema-or-migrations/ sorted alphabetically
   - Executes each file against the database
   - Resolves the repo root correctly whether cwd is repo root OR src/server (handle both)
   - Creates the database/ directory if it does not exist (mkdirSync recursive)
   - Logs which migration was applied

5. Write src/server/src/scripts/seed.ts:
   - Seeds 3 users (2 agents, 1 customer) using individual INSERT statements (not multi-row VALUES — bun:sqlite is strict)
   - Seeds 2 sample tickets and 1 comment
   - Wipes existing data first (DELETE FROM comments; tickets; users in that order)
   - Same repo-root resolution logic as migrate.ts

Constraints:
- No ORM-generated migrations — raw SQL only
- All timestamps are Date.now() (unix ms integers)
- No secrets or hardcoded absolute paths
```

---

## Prompt 3 — REST API routes with Zod validation and state machine

```
Context:
- Stack: Bun + Hono + Drizzle + bun:sqlite + Zod
- DB schema is set up (users, tickets, comments tables)
- createDb(path) and createApp(db) pattern — app.ts receives a Db instance, index.ts wires it

Task: Implement src/server/src/app.ts containing ALL of the following:

**Routes to implement:**
GET    /health             → { ok: true }
GET    /api/users          → { users: User[] } ordered by name
GET    /api/tickets        → { tickets: Ticket[] } with optional ?query= and ?status= filters
GET    /api/tickets/:id    → { ticket: Ticket, comments: Comment[] }
POST   /api/tickets        → create ticket (status always starts as "open")
PATCH  /api/tickets/:id    → partial update (fields + optional status transition)
POST   /api/tickets/:id/comments → add a comment

**State machine module (src/server/src/lib/status-machine.ts):**
- Export TICKET_STATUSES as const tuple
- Export type TicketStatus
- Export isTicketStatus(value: string): value is TicketStatus
- Export canTransition(from, to): boolean
- Export assertValidTransition(from, to): void — throws Error with .code = "INVALID_STATUS_TRANSITION"

**Validation rules (Zod):**
- POST /api/tickets: title (non-empty string), description (non-empty string), priority (enum low|medium|high), createdBy (positive int, must exist in users table), assignedTo (optional positive int or null, must exist in users if provided)
- PATCH /api/tickets/:id: all fields optional but at least 1 required; validate assignedTo user exists if changing; validate status transition if status is changing
- POST comments: message (non-empty string), createdBy (positive int, must exist in users)
- GET /api/tickets: validate ?status= is a known TicketStatus if provided (return 400 if not)

**Error mapping:**
- Zod failures → HTTP 400, code: "VALIDATION_ERROR", include error.flatten() in details
- Unknown user FK → HTTP 400, code: "VALIDATION_ERROR"
- State machine violation → HTTP 409, code: "INVALID_STATUS_TRANSITION"
- Not found → HTTP 404, code: "NOT_FOUND"

**Search (GET /api/tickets):**
- ?query= does case-insensitive substring match on title AND description using SQLite LIKE
- Strip % and _ from user-provided query before interpolating (security: prevent wildcard injection)
- Use: lower(title) LIKE lower('%<cleaned>%') OR lower(description) LIKE lower('%<cleaned>%')
- ?status= filters by exact status value

**CORS:**
- Allow origins: http://localhost:5173, http://127.0.0.1:5173
- Allow methods: GET, POST, PATCH, OPTIONS
- Allow headers: Content-Type

**Export from app.ts:**
- createApiRouter(db: Db): Hono
- createApp(db: Db): Hono  (mounts CORS + /health + /api)
- resolveDatabasePath(): string  (reads DATABASE_PATH env or defaults to ./database/data.db, resolves relative to repo root)

Write the complete file. Do not omit any route. Handle JSON parse errors on request body (try/catch around c.req.json()).
```

---

## Prompt 4 — React + Vite + Tailwind client scaffold and list page

```
Context:
- API is running at http://localhost:3000 with /api/tickets, /api/users
- Vite is configured to proxy /api → http://localhost:3000 (no VITE_API_URL needed)
- React Router 7 is installed (package: "react-router", not "react-router-dom")
- Tailwind v4 configured via @tailwindcss/vite plugin (no tailwind.config.js needed)

Task: Scaffold the React client with:

**src/client/src/main.tsx:**
- createBrowserRouter with routes: / (list), /tickets/new (create), /tickets/:id (detail)
- All routes share a RootLayout parent

**src/client/src/api.ts — typed fetch client:**
- Types: User, Ticket, Comment, TicketStatus, Priority, ApiError
- Functions: fetchUsers(), fetchTickets({ query?, status? }), fetchTicket(id), createTicket(body), patchTicket(id, body), addComment(ticketId, body)
- All functions throw the parsed error object on non-ok response
- Export errorMessage(err: unknown): string helper (extracts error.message or falls back)

**src/client/src/routes/RootLayout.tsx:**
- Sticky header with app name "Support Tickets" and nav links to / and /tickets/new
- Header includes an "Acting as" <select> dropdown populated by GET /api/users
- Exposes currentUserId, users, usersLoading via useOutletContext so child pages can read them
- Shows inline banner if users fetch fails (API down warning)

**src/client/src/routes/TicketListPage.tsx:**
- Controlled search input + status filter <select> (All statuses + each TicketStatus)
- Refetch tickets on input change
- Shows: loading spinner text, empty state (dashed box with "Create one" link), error banner, and the ticket list
- Each ticket row: title, status badge, priority, updated date — links to /tickets/:id

Design requirements:
- Clean, minimal UI using only Tailwind utility classes
- Consistent color palette: slate for neutral surfaces, indigo-600 for primary actions
- All interactive states: disabled on loading, error in red-50/red-800, empty in slate-300 dashed border
- No external component libraries — plain HTML + Tailwind only

Write full file contents. Use explicit Tailwind classes (no @apply, no arbitrary values unless necessary).
```

---

## Prompt 5 — Ticket create and detail pages

```
Context:
- RootLayout provides OutletContext: { currentUserId?: number; users: User[]; usersLoading: boolean }
- patchTicket(id, body) and addComment(ticketId, body) are implemented in api.ts
- Tailwind + React Router are set up

Task: Implement two more pages.

**src/client/src/lib/status-ui.ts:**
- allowedNextStatuses(current: TicketStatus): TicketStatus[]  — mirrors server transition map exactly:
    open → [in_progress, cancelled]
    in_progress → [resolved, cancelled]
    resolved → [closed]
    closed → []
    cancelled → []
- statusLabel(s: TicketStatus): string  — human-readable label (e.g. "in_progress" → "In progress")

**src/client/src/routes/TicketCreatePage.tsx:**
- Form: title (required text), description (required textarea, 4 rows), priority select (low/medium/high default medium), assignee select (populated from context users, optional/unassigned)
- On submit: calls createTicket({ title, description, priority, createdBy: currentUserId, assignedTo })
- On success: navigate to /tickets/:newId
- Validates currentUserId is set (show inline error if not)
- Disable submit button while submitting or while users are loading
- Shows API error message on failure

**src/client/src/routes/TicketDetailPage.tsx:**
- Fetches ticket + comments via fetchTicket(id) on mount
- Shows: loading state, error state (with ← back link), detail view
- Status section: shows current status chip, renders buttons for each allowedNextStatuses() entry
  - Clicking a button calls patchTicket(id, { status: next })
  - Shows inline error if transition fails (API message, e.g. INVALID_STATUS_TRANSITION)
  - Hides buttons when status is terminal (closed/cancelled)
- Edit form: title, description, priority, assignee — PATCH on save (separate from status buttons)
- Comments section: list of comments (author name from users context, formatted date), then add-comment form
  - Add comment calls addComment(id, { message, createdBy: currentUserId })
  - Clear textarea on success, append new comment to local state without refetch

All error messages must come from the API response (errorMessage(err)) — do not hardcode generic strings.
Use the same Tailwind design language as the list page (slate surfaces, indigo primary, red errors, amber for transition warnings).
```

---

## Prompt 6 — Bun integration tests for the status state machine

```
Context:
- Bun test runner (bun test), not Jest or Vitest
- createApp(db) returns a Hono app — use app.request(path, init) for HTTP simulation (no real server needed)
- createDb(path) wraps bun:sqlite + drizzle
- Root package.json has drizzle-orm, hono, zod in devDependencies so tests can import from src/server/src/

Task: Write tests/status-machine.integration.test.ts

**Setup pattern (important — do this exactly):**
- One describe block with a single shared dbPath = `tests/ticket-sm-${crypto.randomUUID()}.db`
- beforeAll: create fresh SQLite DB, apply 0001_init.sql migration, call createDb(), createApp()
- beforeEach: DELETE FROM comments; DELETE FROM tickets; DELETE FROM users (in that order); then INSERT one user and one open ticket, store ticketId
- afterAll: delete the temp DB file

**Test cases to cover:**
1. "accepts open → in_progress"  — PATCH status: in_progress, expect 200, body.ticket.status === "in_progress"
2. "rejects open → closed"       — PATCH status: closed, expect 409, body.error.code === "INVALID_STATUS_TRANSITION"
3. "accepts full valid chain open → in_progress → resolved → closed, then rejects closed → open"  — sequential PATCHes, final one expects 409
4. "accepts open → cancelled"    — PATCH status: cancelled, expect 200
5. "rejects resolved → cancelled" — advance to resolved first, then PATCH cancelled, expect 409

**Assertions:**
- Use Bun's expect().toBe() — do not use Jest matchers
- Assert both HTTP status code AND error.code on failure cases
- Cast response JSON with `as { ticket?: { status: string }; error?: { code: string } }`

**Module resolution note (include as a comment in the file):**
// drizzle-orm, hono, and zod must be in the root package.json devDependencies
// for bun test to resolve them when running from the repo root

Do not use mock databases, in-memory SQLite string mode, or jest.fn(). Use the real app and real SQLite file.
```

---

## Prompt 7 — Fix: module resolution error in Bun tests

```
bun test tests/ is failing with:

  error: Cannot find package 'drizzle-orm' from
  '/Users/.../ai-assesment/tests/status-machine.integration.test.ts'

The test file imports from src/server/src/db/client which imports drizzle-orm.
drizzle-orm is currently only in src/server/package.json.

When bun test runs from the repo root, it resolves node_modules from the root package.json, not from src/server.

Fix: add drizzle-orm, hono, and zod to the root package.json devDependencies at the same major versions already used in src/server/package.json.

Do not move the test files. Do not change the test file itself. Only modify package.json at the repo root.
Show me the exact devDependencies block to add. Then run bun install.
```

---

## Prompt 8 — Fix: incorrect relative imports in app.ts

```
After fixing the module resolution error, I now get:

  error: Cannot find module '../db/schema' from
  '/Users/.../ai-assesment/src/server/src/app.ts'

app.ts is located at src/server/src/app.ts.
The schema is at src/server/src/db/schema.ts.
The relative path should be ./db/schema, not ../db/schema.

Fix all incorrect relative imports in src/server/src/app.ts:
- ../db/client → ./db/client
- ../db/schema → ./db/schema
- ../lib/http-error → ./lib/http-error
- ../lib/status-machine → ./lib/status-machine

Show me only the updated import block at the top of app.ts. Confirm no other files have the same issue.
```

---

## Prompt 9 — Code review: search safety and API error consistency

```
Please review the following areas of src/server/src/app.ts and flag any issues:

1. Search input handling in GET /api/tickets:
   - Is the user-supplied ?query= parameter sanitised before being interpolated into a LIKE clause?
   - Could a user pass literal % or _ characters to broaden the search unexpectedly?
   - What is the minimal fix that does not change the API behaviour?

2. Error response consistency:
   - Do all 4xx routes return the { error: { code, message, details? } } envelope?
   - Is there any path where a raw Error or unstructured object could be returned to the client?

3. CORS:
   - Is the allowlist restrictive enough for a local dev setup?
   - Are there any headers or methods that should be removed?

For each issue found: describe it, rate severity (low/medium/high), and provide the exact code change.
Do not refactor anything beyond what is needed to address these specific points.
```

---

## Prompt 10 — Documentation: generate api-contract.md

```
Generate api-contract.md for our Support Ticket Management System API.

Base URL (dev): http://localhost:3000
All errors use: { "error": { "code": "...", "message": "...", "details"?: {} } }

Document every endpoint using this structure per endpoint:
- Heading: Method + Path
- Purpose (one sentence)
- Query params table (if any): Param | Type | Required | Notes
- Request body table (if any): Field | Type | Required | Rules
- Success response: HTTP status + JSON shape example
- Error responses: HTTP status + code + when it occurs

Endpoints to document:
GET  /health
GET  /api/users
GET  /api/tickets          (query params: query, status)
GET  /api/tickets/:id
POST /api/tickets
PATCH /api/tickets/:id     (include state machine table: current → allowed next)
POST /api/tickets/:id/comments

Requirements:
- Write in clean Markdown, use tables for params/fields
- State machine section must include all 5 valid transitions AND note that closed/cancelled are terminal
- Be precise about the 409 error code name: INVALID_STATUS_TRANSITION
- Do not include implementation details (no Drizzle, no bun:sqlite, no internal file paths)
- Audience: a frontend developer who has never seen the backend code
```

---

## Prompt 11 — Reflection: what AI got wrong (for reflection.md)

```
I am writing the reflection.md section of my assessment submission. Help me articulate the following accurately and honestly based on what actually happened during this build:

1. Two concrete things AI got wrong:
   a. It generated relative import paths in app.ts using ../ when the file's actual location required ./
   b. It assumed workspace-scoped devDependencies would resolve from the repo root when running bun test

2. How I caught each mistake (describe the actual error message / signal)

3. What the fix was and how I validated it (bun test passing, smoke test curl /health)

4. One thing I would improve in my prompting next time to avoid these specific errors

Write this as a first-person developer reflection. Be direct and specific — do not use generic AI-bashing language. Max 250 words for the two issues combined. Tone: honest, technical, self-aware.
```

---

## Prompt 12 — Final check: README completeness

```
Review README.md for the Support Ticket Management System and verify it includes all of the following. For each missing item, add it:

Required sections (from the assessment guide):
1. Project overview (1–2 sentences)
2. Tech stack list
3. Prerequisites (just: Bun 1.1+)
4. Setup instructions (bun install, cp .env.example .env, bun run db:migrate, bun run db:seed)
5. Running the app (bun run dev — explain that it starts both API :3000 and Vite :5173)
6. Running tests (bun test tests/)
7. Environment variables table (DATABASE_PATH, PORT, their defaults)
8. Folder structure reference (brief table)
9. Security note about no authentication in Core

Make only additive changes — do not delete or reorder existing content.
Format: clean Markdown, use code blocks for shell commands, use a table for env vars.
```
