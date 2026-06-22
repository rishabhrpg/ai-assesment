# AI prompt history — documentation

## Entry DOC1 — README structure

**Prompt**  
“Generate README sections: overview, stack, setup (`bun install`, migrate, seed), dev commands, tests, env vars, folder map, security note about no auth.”

**AI response**  
Draft README with command blocks.

**Accepted**  
Structure + command names aligned to actual `package.json` scripts.

**Changed**  
Clarified Vite proxy behavior for `/api` vs setting `VITE_API_URL` (not required in dev with proxy).

**Rejected**  
Long tutorial video links—out of scope.

---

## Entry DOC2 — api-contract.md

**Prompt**  
“Write `api-contract.md` enumerating each endpoint with purpose, query params, body schema, response, and error codes.”

**AI response**  
Markdown tables + JSON snippets.

**Accepted**  
Tables + explicit `409` semantics for transitions.

**Rejected**  
Embedding generated OpenAPI YAML in Core—Stretch item.
