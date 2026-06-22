# AI prompt history — implementation

## Entry I1 — Hono route skeleton

**Prompt**  
“Generate `src/server/src/app.ts` with CORS for `localhost:5173`, `/health`, and `/api` routes mounting users + tickets + comments. Use Drizzle with `bun:sqlite`.”

**AI response**  
Large file with handlers and zod schemas inline.

**Accepted**  
Route naming, zod field rules, Drizzle query structure.

**Changed**  
Fixed import paths (`./db` not `../db`) after runtime failure; tightened list query composition with `sql` fragments.

**Rejected**  
Splitting every handler into separate files in the first pass—premature for the small Core API.

---

## Entry I2 — React list page

**Prompt**  
“Create a ticket list page with search + status filter + loading/empty/error states. Use fetch to `/api/tickets`.”

**AI response**  
`useEffect` refetch on filter change, link to detail route.

**Accepted**  
Controlled inputs and simple `errorMessage` helper.

**Changed**  
Used Vite dev proxy for `/api` instead of hard-coding absolute API URLs.

**Rejected**  
Adding React Query—extra dependency not justified for Core.

---

## Entry I3 — Detail page transitions

**Prompt**  
“Detail view: edit fields PATCH, separate buttons for allowed status transitions, show API error text on failure.”

**AI response**  
Form + buttons calling `patchTicket`.

**Accepted**  
Separation between field save and status transitions.

**Changed**  
Ensured `createdBy` for comments comes from header selector, not a hardcoded id.
