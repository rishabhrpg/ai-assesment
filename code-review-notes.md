# Code review notes

## AI-assisted review summary

- Reviewed API error shape consistency (`code`, `message`, optional `details`).
- Checked that UI surfaces backend messages for `409` transitions.
- Flagged wildcard characters in search input; mitigated by stripping `%` and `_` from user-supplied search terms before `LIKE`.

## My review observations

- Confirmed CORS allowlist matches Vite default ports.
- Verified `PRAGMA foreign_keys = ON` for SQLite referential integrity.

## Changes made after review

- Adjusted search helper to strip `%` / `_`.
- Documented security posture (no auth) in `README.md`.

## Suggestions rejected

- Adding JWT auth in Core — deferred as Stretch per guide.
