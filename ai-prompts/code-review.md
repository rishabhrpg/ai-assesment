# AI prompt history — code review

## Entry R1 — Wildcards in search

**Prompt**  
“Review `safeLikePattern` / SQL LIKE usage for footguns. Suggest a minimal hardening if needed.”

**AI response**  
Strip `%`/`_` or require `ESCAPE` clause; prefer stripping for simplicity.

**Accepted**  
Strip wildcards from user input for Core.

**Rejected**  
Switching to `instr(lower(title), lower(query))` only—acceptable alternative but not necessary once stripping exists.

---

## Entry R2 — Auth gap

**Prompt**  
“Should we add JWT now?”

**AI response**  
Auth improves realism but is Stretch; recommend documenting risk instead.

**Accepted**  
Document “demo only / no auth” in README.

**Rejected**  
Implementing JWT in the same PR as Core—scope creep.
