# AI prompt history — design

## Entry D1 — API error shape

**Prompt**  
“Pick a single JSON error envelope for all `4xx` responses in Hono. Show an example for validation vs invalid status transition.”

**AI response**  
Proposed `{ error: { code, message, details? } }` with examples `VALIDATION_ERROR` vs `INVALID_STATUS_TRANSITION`.

**Accepted**  
Envelope + machine-oriented `code` for UI branching.

**Changed**  
Mapped `409` specifically to invalid transitions (not generic `400`) so the UI can style conflict errors differently later.

---

## Entry D2 — Search semantics

**Prompt**  
“For SQLite `LIKE` search on title+description, how do we avoid user-supplied `%` wildcards breaking results? Prefer minimal code.”

**AI response**  
Strip `%`/`_`, use case-insensitive match with `lower(...) LIKE lower(?)`.

**Accepted**  
Strip approach for Core scope.

**Rejected**  
Full FTS5 migration—valuable Stretch, not required for keyword search in Core.

---

## Entry D3 — UI status actions

**Prompt**  
“Mirror the server state machine on the client so we don’t render illegal buttons. Provide a small helper `allowedNextStatuses`.”

**AI response**  
Returned a map parallel to server transitions.

**Accepted**  
Pattern of duplicating transition table read-only on client.

**Rejected**  
Fetching allowed transitions from API—nice, but unnecessary API surface for Core.
