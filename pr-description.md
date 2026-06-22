# Pull request description

## Summary

Implements the assessment **Core** Support Ticket Management System: Bun + Hono API with SQLite/Drizzle, React + TypeScript + Tailwind UI, mandatory status state machine with integration tests, and full documentation/prompt artifacts.

## Features implemented

- Ticket CRUD (create, list w/ search+status filter, detail, PATCH fields).
- Status lifecycle enforcement on server + guided actions in UI.
- Comments API + UI.
- Seeded users; demo “acting as” user selector.

## Technical changes

- New workspaces under `src/server` and `src/client`.
- SQL migration `database/schema-or-migrations/0001_init.sql`.
- Root scripts: `dev`, `db:migrate`, `db:seed`, `test`.

## Database changes

- Initial schema for `users`, `tickets`, `comments` + seed script.

## Testing done

- `bun test tests/` (state machine integration suite).

## AI usage summary

- AI assisted with scaffolding, route wiring, React layout, and test structure.
- Human reviewed state machine rules, import paths, and dependency layout for Bun tests.

## Screenshots / demo notes

_Add screenshots of list + detail + invalid transition error if required by your reviewer._

## Known limitations

- No authentication; user id chosen in UI.
- Search is substring `LIKE` without full-text ranking.

## Future improvements

- Stretch: auth, pagination, OpenAPI, Docker/CI.
