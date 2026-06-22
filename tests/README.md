# Tests

Integration tests live at:

- [`status-machine.integration.test.ts`](status-machine.integration.test.ts)

Run from repository root:

```bash
bun test tests/
```

Tests create a temporary SQLite database file under `tests/` and exercise the real Hono app handler.
