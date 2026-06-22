# Implementation plan

## Overview

Deliver the guide’s **Core** ticket system: Bun + Hono API, React client, SQLite persistence, strict status machine, search/filter, and integration tests. Documentation and curated prompt history live alongside code per the assessment structure.

## Task breakdown

1. **Scaffold** — Bun workspaces (`src/server`, `src/client`), shared root scripts, Tailwind + Vite React app, `.env.example`, `.gitignore`.
2. **Database** — SQL migration for `users`, `tickets`, `comments`; Drizzle schema mirroring tables; migrate + seed scripts.
3. **API** — REST endpoints, Zod validation, CORS for Vite origin, status machine module shared semantics with UI.
4. **UI** — List, create, detail routes; header “acting as” user selector; status buttons derived from allowed transitions.
5. **Tests** — `tests/status-machine.integration.test.ts` against real Hono `app.request`.
6. **Docs** — Root lifecycle markdown files, `database/setup-notes.md`, `ai-prompts/*`, `tool-specific/cursor-workflow/*`.

## Milestones

| Milestone | Definition of done |
|-----------|---------------------|
| M1 | Migrate + seed runs; `/health` responds |
| M2 | All Core endpoints functional via curl/fetch |
| M3 | UI completes happy paths |
| M4 | State machine tests green + README verified |

## AI usage plan

- AI for initial scaffolding and repetitive CRUD wiring.
- Human for reviewing state machine parity (API vs UI), import paths, and assessment doc tone.

## Risks & mitigation

| Risk | Mitigation |
|------|------------|
| Workspace module resolution for root tests | Add shared deps at root **or** relocate tests; we added root `devDependencies`. |
| SQLite file locking | Single writer pattern; tests use one DB connection + `beforeEach` cleanup. |
