# AI prompt history — planning

> **Note:** Entries below are **curated, representative** transcripts written for this assessment repository. They show the *kind* of context, iteration, and review expected from a strong submission—not necessarily verbatim logs.

---

## Entry P1 — Scope & stack freeze

**Prompt (summary)**  
“You are helping me build the Core Support Ticket Management System from our internal assessment guide. Constraints: Bun + Hono backend, React + TypeScript + Tailwind frontend, SQLite persistence, no auth in Core. Summarize mandatory entities, endpoints, and the exact status machine. Propose a repo folder layout matching the guide’s `src/`, `tests/`, `database/`, and root markdown docs.”

**AI response (summary)**  
Listed entities, REST sketch, transitions, suggested `src/server` + `src/client`, Drizzle for SQLite, integration tests via Hono `app.request`.

**Accepted**  
Stack triad (Bun/Hono/React), SQLite, split `src/server` vs `src/client`, test placement under `tests/`.

**Changed**  
Flattened `ticket-management-system/` outer folder because the Git repo root is already the project container.

**Rejected**  
PostgreSQL-first proposal for Core—more setup friction than needed for the assessment’s local reproducibility goal.

---

## Entry P2 — Milestones

**Prompt**  
“Turn the spec into milestones with a Definition of Done for each. Call out where human review is mandatory (state machine parity).”

**AI response**  
M1 migrations, M2 API, M3 UI, M4 tests+docs.

**Accepted**  
Milestone ordering and explicit “human verifies transitions vs guide diagram” gate.

**Rejected**  
Adding Stretch (JWT) inside M3—would dilute Core completion risk.
