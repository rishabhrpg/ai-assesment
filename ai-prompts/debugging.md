# AI prompt history — debugging

## Entry B1 — Module not found from tests

**Prompt**  
`bun test tests/` fails: `Cannot find package 'drizzle-orm' from .../tests/...`. Repo uses Bun workspaces. Fix minimally.

**AI response**  
Suggested adding deps to root or moving tests into `src/server`.

**Accepted**  
Root `devDependencies` addition (minimal file move).

**Changed**  
Pinned same major versions as server workspace for consistency.

**Rejected**  
Switching entire repo to npm/pnpm—unnecessary churn.

---

## Entry B2 — Wrong relative import depth

**Prompt**  
Error: `Cannot find module '../db/schema' from .../app.ts` when tests import `createApp`. Explain and fix.

**AI response**  
Identified `app.ts` lives in `src/server/src`, so `../db` resolves incorrectly.

**Accepted**  
Switch to `./db/schema`.

**Rejected**  
Barrel exports across folders to mask paths—adds indirection without benefit here.
