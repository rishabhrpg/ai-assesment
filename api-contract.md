# API contract

Base URL (dev): `http://localhost:3000`  
All successful JSON responses use appropriate HTTP verbs; errors use the envelope below.

## Authentication

The API uses **session-based authentication** via HTTP-only cookies. All protected endpoints require a valid session cookie.

- Session cookie name: `session_id`
- Session lifetime: 7 days
- CORS credentials are enabled for the dev client origin

## Error envelope

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable summary",
    "details": {}
  }
}
```

Common codes: `VALIDATION_ERROR`, `NOT_FOUND`, `INVALID_STATUS_TRANSITION`, `UNAUTHORIZED`, `FORBIDDEN`.

---

## `GET /health`

**Purpose:** Liveness check.

**Response:** `200` — `{ "ok": true }`

---

## `POST /api/auth/login`

**Purpose:** Authenticate user and create session.

**Body (JSON)**

| Field      | Type   | Required | Rules |
|------------|--------|----------|-------|
| `email`    | string | yes      | valid email |
| `password` | string | yes      | non-empty |

**Response:** `200` — `{ "user": { "id", "name", "email", "role" } }`

**Errors:** `400` validation error, `401` invalid credentials.

**Notes:** Sets session cookie on successful login.

---

## `POST /api/auth/logout`

**Purpose:** End session and clear cookie.

**Response:** `200` — `{ "ok": true }`

**Notes:** Clears session cookie.

---

## `GET /api/auth/me`

**Purpose:** Get current authenticated user (if any).

**Response:** `200` — `{ "user": { "id", "name", "email", "role" } | null }`

---

## `GET /api/users`

**Purpose:** List users (admin, manager, agent only).

**Auth required:** Yes

**Role permissions:** `admin`, `manager`, `agent`

**Response:** `200`

```json
{ "users": [{ "id": 1, "name": "...", "email": "...", "role": "..." }] }
```

**Errors:** `401` not authenticated, `403` insufficient permissions.

---

## `GET /api/tickets`

**Purpose:** List tickets with optional search and status filter.

**Auth required:** Yes

**Role permissions:** 
- `admin`, `manager`, `agent`: See all tickets
- `customer`: See only own tickets

**Query**

| Param    | Type   | Required | Notes |
|----------|--------|----------|-------|
| `query`  | string | no       | Case-insensitive substring on title/description; strips `%` and `_`. |
| `status` | string | no       | Must be `open`, `in_progress`, `resolved`, `closed`, or `cancelled`. |

**Response:** `200` — `{ "tickets": [ /* ticket rows */ ] }`

**Errors:** `400` if `status` invalid, `401` not authenticated.

---

## `GET /api/tickets/:id`

**Purpose:** Ticket detail with comments (ordered ascending by `createdAt`).

**Auth required:** Yes

**Role permissions:**
- `admin`, `manager`: All tickets
- `agent`: All tickets
- `customer`: Own tickets only

**Response:** `200`

```json
{
  "ticket": { "id": 1, "title": "", "description": "", "priority": "low|medium|high", "status": "open|...", "assignedTo": null, "createdBy": 1, "createdAt": 0, "updatedAt": 0 },
  "comments": [{ "id": 1, "ticketId": 1, "message": "", "createdBy": 1, "createdAt": 0 }]
}
```

**Errors:** `404` if ticket id missing/invalid, `401` not authenticated, `403` access denied.

---

## `POST /api/tickets`

**Purpose:** Create ticket (starts as `open`).

**Auth required:** Yes

**Role permissions:** `admin`, `manager`, `agent`, `customer` (all authenticated users)

**Body (JSON)**

| Field          | Type           | Required | Rules |
|----------------|----------------|----------|-------|
| `title`        | string         | yes      | non-empty |
| `description`  | string         | yes      | non-empty |
| `priority`     | string         | yes      | `low` \| `medium` \| `high` |
| `assignedTo`   | number \| null | no       | only `admin`/`manager` can assign |

**Notes:** `createdBy` is automatically set from the authenticated user session.

**Response:** `201` — `{ "ticket": { ... } }`

**Errors:** `400` validation / unknown user ids, `401` not authenticated, `403` permission denied.

---

## `PATCH /api/tickets/:id`

**Purpose:** Partial update of ticket fields and/or status.

**Auth required:** Yes

**Role permissions:**
- `admin`, `manager`: Any ticket
- `agent`: Own tickets or assigned tickets
- `customer`: Own tickets only

**Body (JSON)** — at least one key required:

| Field          | Type           | Notes |
|----------------|----------------|-------|
| `title`        | string         | optional |
| `description`  | string         | optional |
| `priority`     | string         | optional enum |
| `assignedTo`   | number \| null | only `admin`/`manager` can assign |
| `status`       | string         | optional; must follow state machine |

**State machine (`status` changes only)**

Allowed when current → next:

- `open` → `in_progress`, `cancelled`
- `in_progress` → `resolved`, `cancelled`
- `resolved` → `closed`
- `closed` → _(none)_
- `cancelled` → _(none)_

Same status as current is a no-op at the transition validator.

**Response:** `200` — `{ "ticket": { ... } }`

**Errors:** `404`, `400`, `401`, `403` permission denied, `409` with `INVALID_STATUS_TRANSITION`.

---

## `POST /api/tickets/:id/comments`

**Purpose:** Append a comment.

**Auth required:** Yes

**Role permissions:**
- `admin`, `manager`, `agent`: Can comment on any accessible ticket
- `customer`: Can only comment on own tickets

**Body**

| Field       | Type   | Required |
|-------------|--------|----------|
| `message`   | string | yes (non-empty) |

**Notes:** `createdBy` is automatically set from the authenticated user session.

**Response:** `201` — `{ "comment": { ... } }`

**Errors:** `404` ticket missing, `400` validation, `401` not authenticated, `403` permission denied.

---

## Role Permissions Summary

| Role | Tickets Read | Tickets Create | Tickets Update | Tickets Assign | Comments Create |
|------|--------------|----------------|----------------|----------------|-----------------|
| `admin` | All | Yes | All | Yes | All |
| `manager` | All | Yes | All | Yes | All |
| `agent` | All | Yes | Own/Assigned | No | All |
| `customer` | Own only | Yes | Own only | No | Own only |
