# Review fixes

| Fix # | Issue found | Source | Change made | Verification |
|-------|-------------|--------|-------------|--------------|
| 1 | Root tests missing deps | Self / AI | Added server libs to root `devDependencies` | `bun test tests/` passes |
| 2 | Wrong relative imports in `app.ts` | Bun stack trace | `./db` vs `../db` | Tests + smoke `/health` |
| 3 | Search wildcard safety | AI review note | Strip `%`/`_` in `safeLikePattern` | Manual curl with `%` |
