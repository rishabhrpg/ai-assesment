# AI prompt history — testing

## Entry T1 — Integration test strategy

**Prompt**  
“Write Bun integration tests proving the ticket status machine through Hono `app.request`. Use a temp SQLite file, migrate schema, seed one user per test reset.”

**AI response**  
Example `beforeEach` cleanup pattern and sample `409` assertion.

**Accepted**  
Using the real app (`createApp`) rather than calling handlers in isolation.

**Changed**  
Single shared `db` connection + `beforeEach` row wipes instead of recreating the DB file per test (faster, fewer flakes).

**Rejected**  
Mocking Drizzle entirely—would not exercise SQL constraints.

---

## Entry T2 — Negative path coverage

**Prompt**  
“Add tests: `open→closed` rejected; after `resolved`, `→cancelled` rejected; happy path chain through `closed`.”

**AI response**  
Added cases with sequential PATCHes.

**Accepted**  
All cases; kept assertions on HTTP status + `error.code`.

**Rejected**  
Snapshot testing full JSON bodies—too brittle for this repo.
