# Tool workflow

## Primary AI tool

Cursor (IDE-integrated assistant + agent mode).

## Project context

- Repository `README.md`, `data-model.md`, `api-contract.md`, and `tool-specific/cursor-workflow/project-context.md` provide stack and domain context.
- Cursor **rules** under `.cursor/rules/` encode global engineering constraints (security, dependency discipline, tests).

## Requirement analysis

- Used AI to restate the guide’s Core vs Stretch scope, acceptance criteria, and the mandatory status machine.
- Human verified assumptions (no auth, seeded users only) against the guide.

## Planning and design

- AI proposed monorepo layout (`src/server`, `src/client`), SQLite, and REST shape; captured decisions in `design-notes.md` and `implementation-plan.md`.

## Code generation

- AI scaffolded Hono routes, Drizzle schema, React pages, and tests; developer reviewed imports, module paths, and Bun test resolution (root `devDependencies` for shared imports).

## Validation of AI output

- Ran `bun run db:migrate`, `bun test`, and `src/client` production build.
- Manually exercised create → transition → invalid transition paths in the UI.

## Testing with AI

- Prompted for integration tests around state transitions; reviewed assertions and DB isolation (`beforeEach` reset).

## Debugging with AI

- Fixed incorrect relative imports in `app.ts` (`../db` vs `./db`) discovered when tests imported the app from the repo root.

## Code review with AI

- Used AI for a secondary pass on error JSON shape and UI error display; see `code-review-notes.md`.

## Information not shared with AI

- No production credentials, customer PII, or internal URLs were pasted into prompts.

## Reuse in a real project

- Keep living `api-contract.md` + `data-model.md` as the source of truth for agents.
- Maintain seed + migration scripts as the reproducible baseline for every developer machine and CI.
