# Test results

_Last updated: generated during implementation_

## Test run summary

Command: `bun test tests/`

```
bun test v1.3.14 (0d9b296a)

tests/status-machine.integration.test.ts:
(pass) ticket status transitions (API integration) > accepts open → in_progress
(pass) ticket status transitions (API integration) > rejects open → closed
(pass) ticket status transitions (API integration) > accepts full valid chain open → in_progress → resolved → closed
(pass) ticket status transitions (API integration) > accepts open → cancelled
(pass) ticket status transitions (API integration) > rejects resolved → cancelled

 5 pass
 0 fail
```

## Coverage notes

- Integration tests focus on the **status state machine** via HTTP, not line coverage percentages.

## Known gaps

- No automated UI/E2E tests.
- Field-level PATCH permutations not exhaustively enumerated in tests.
