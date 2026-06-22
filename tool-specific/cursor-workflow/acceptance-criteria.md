# Acceptance criteria (Cursor working copy)

Mirror of repo [`acceptance-criteria.md`](../../acceptance-criteria.md) for quick agent access.

## Must pass

- [x] Create/list/detail/update ticket via UI
- [x] Status transitions enforced (server + visible UI failure)
- [x] Search + status filter
- [x] Comments
- [x] Persist in SQLite across restarts
- [x] `bun test tests/` green

## Explicit non-goals

- [ ] Auth / RBAC (Stretch)
