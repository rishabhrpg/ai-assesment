# Debugging notes

## Issue 1: Bun tests could not resolve `drizzle-orm`

**Problem:** Running `bun test tests/` from the repo root failed module resolution for workspace-only dependencies.

**Investigation:** Confirmed `drizzle-orm` was only declared in `src/server/package.json`.

**AI help:** Suggested hoisting shared server deps to the root `devDependencies` for test imports.

**Validation:** Re-ran `bun install` and `bun test tests/` until imports resolved.

**Final fix:** Added `drizzle-orm`, `hono`, and `zod` to the root `package.json` `devDependencies`.

---

## Issue 2: `Cannot find module '../db/schema'` when importing `app.ts`

**Problem:** `src/server/src/app.ts` used `../db/schema`, which resolves outside `src/` and breaks imports when Bun loads the file from tests.

**Investigation:** Verified filesystem layout (`src/server/src/app.ts` next to `db/`).

**AI help:** Pointed to incorrect relative import depth.

**Validation:** `bun test` and a small `bun -e` import smoke test.

**Final fix:** Switched imports in `app.ts` to `./db/...` and `./lib/...`.
