# Reflection

## What I built

A Core-scope support ticket system with API + SPA + SQLite persistence and automated tests for the hardest rule: the status state machine.

## How I used AI across the lifecycle

- **Planning:** summarized guide constraints and proposed stack/repo layout.
- **Implementation:** generated server/client boilerplate and iterated on failures.
- **Testing:** drafted integration tests; refined DB lifecycle per test.
- **Debugging:** used traces from Bun to fix import paths and dependency visibility.
- **Documentation:** drafted lifecycle markdown; human-edited for accuracy.

## What AI helped with most

- Repetitive wiring (routes, forms, scripts) and remembering Hono/Drizzle patterns.

## What AI got wrong

- Initial relative imports in `app.ts` (`../db` instead of `./db`).
- Initial assumption that workspace deps would resolve for root-level tests without root declarations.

## How I validated AI output

- Ran migrations, seeds, unit/integration tests, and a production build of the client.

## What I would improve next

- Add component tests or Playwright smoke for UI regressions.
- Debounce search input to reduce API chatter.

## Reusable workflow artifacts

- `tool-specific/cursor-workflow/project-context.md` + `spec.md` as durable context for future sessions.
- `ai-prompts/` categorized prompt patterns for planning, testing, and review.
