# Cursor rules / instructions (local)

## How to work in this repo

1. Read `tool-specific/cursor-workflow/project-context.md` before large edits.
2. Prefer **small diffs**; do not rename tables or status strings without updating tests + docs.
3. After server changes, run `bun test tests/` from repo root.
4. After client changes, run `bun run build` inside `src/client`.

## Global rules

This project inherits workspace `.cursor/rules/` (security, dependency discipline, tests).

## Commands reference

| Command | Purpose |
|---------|---------|
| `bun run dev` | API + Vite concurrently |
| `bun run db:migrate` | Apply SQL migrations |
| `bun run db:seed` | Seed demo users/tickets |
| `bun test tests/` | Integration tests |

## API testing tips

```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/api/users
```
