# When — Architecture Fault Audit

Date: 2026-10-12  
Repository: johnmanneh/family-calendar  
Stack: Expo / React Native (mobile/), React CRA + FullCalendar (web/), Node.js / Express (backend/), PostgreSQL on Railway

See `03-audit-verification.md` for current status of each fault.

---

## Severity definitions

- **P0** — Fix before going live. Security or data integrity blocker.
- **P1** — Fix soon. Correctness or privacy gap.
- **P2** — Plan for later. Reliability or hardening.
- **Future** — Relates to a feature not yet built.

---

## Current app faults

### F-01 — Event update has no authorization check on local dev
**Severity:** P0  
`PUT /api/events/:id` uses `canEditEvent()` from `utils/access.js`, which depends on `events.owner_id`. That column exists on Railway but has no migration file. Local dev DB is missing it — the check silently fails or errors locally.

**Fix:** Write `030_add_events_owner_id.sql` migration.

---

### F-03 — Attendee and task endpoints need scope check audit
**Severity:** P0  
`utils/access.js` provides `canInvite()`, `canAssignOnEvent()`, and `taskAccess()`. Not confirmed that every attendee and task controller actually calls these. A missed call means an endpoint accepts a guessed ID without verifying family membership.

**Fix:** Audit every controller in `backend/src/controllers/events/eventAttendee/` and `backend/src/controllers/tasks/`. Confirm each one calls the relevant `access.js` function.

---

### F-13 — Missing migration files for Railway schema changes
**Severity:** P0  
Three schema changes were applied directly to Railway without migration files:

| Missing migration | What it adds |
|---|---|
| `030_add_events_owner_id.sql` | `events.owner_id` column + FK + index |
| `031_add_users_managed.sql` | `users.is_managed`, `users.managed_by` + check constraint |
| `032_create_calendar_permissions.sql` | `calendar_permissions` table + constraints + indexes |

Local dev DB is out of sync. Anyone setting up locally, or if Railway is rebuilt, will have a broken app.

**Fix:** Write the three migration files to match exactly what exists on Railway.

---

### F-21a — Avatars stored on ephemeral Railway disk
**Severity:** P0  
Profile photos are saved to `backend/uploads/avatars/` on the Railway container filesystem. Every new deploy wipes that folder — uploaded photos are lost on each deployment.

**Fix:** Move avatar storage to Cloudinary (free tier). Update `uploadAvatar.js` to upload to Cloudinary and store the returned URL.

---

### F-10 — Visibility contract not applied to all read paths
**Severity:** P1  
The visibility contract (`full` / `busy` / `none`) is implemented in `utils/access.js` and applied to `GET /api/events/:id` and the calendar list. It has not been verified on:
- Notifications payload (task/event notification bodies may include private event titles)
- Member profile event list (`GET /family/members/:userId/events`)

**Fix:** Audit those two paths and filter sensitive fields server-side before responding.

---

### F-18 — Many endpoints return raw DB rows
**Severity:** P1  
Several controllers use `SELECT e.*` or `SELECT *` and return the full row to the client. This means any column added to the table in future is automatically exposed.

**Fix:** Use explicit column lists in SELECT statements for sensitive tables (events, users, tasks).

---

### F-21b — CORS open to all origins
**Severity:** P1  
The Express app uses `cors()` with no origin restriction. Any website can make authenticated requests to the API if it has a user's token.

**Fix:** Set `cors({ origin: ['https://its4us.app', 'http://localhost:3000'] })` in `app.js`.

---

### F-21c — No rate limiting on auth endpoints
**Severity:** P1  
`POST /api/auth/login` and `POST /api/auth/register` have no rate limiting. Allows brute-force credential attacks.

**Fix:** Add `express-rate-limit` to auth routes.

---

### F-15 — All-day events stored as timestamp, not DATE
**Severity:** P2  
All-day events are stored as midnight UTC timestamps. This can cause off-by-one errors in different timezones (e.g. an event on Oct 12 stored as `2026-10-12T00:00:00Z` displays as Oct 11 at 10pm in New York).

**Fix:** Store all-day dates as `DATE` type or as ISO date strings (`YYYY-MM-DD`) and handle them separately from timed events.

---

### F-16 — No concurrency protection on event updates
**Severity:** P2  
Two family members editing the same event simultaneously will silently overwrite each other's changes. No `updated_at` version check exists.

**Fix:** Add an `If-Match` / `updated_at` check to `PUT /api/events/:id` — return `409 Conflict` if the submitted version is stale.

---

### F-19 — Mobile screens call API directly (context layer bypassed)
**Severity:** P2  
All 14 mobile screens call `API` directly instead of going through context. This violates the architecture rule (context owns API calls) and makes the mobile harder to test and maintain.

**Fix:** Systematic cleanup — move API calls from each screen into the appropriate context. See cleanup plan.

---

### F-20 — No security test suite
**Severity:** P2  
No automated tests exist. Authorization rules (`access.js`) are untested. A regression in any route could silently re-open a security gap.

**Fix:** Add integration tests covering: unauthenticated requests, cross-family ID guessing, private event access via all read paths, edit/delete by non-owner.

---

## Future feature faults (not applicable until feature is built)

These were identified during the delegated calendar design review. They are not current bugs — they describe design requirements for features not yet implemented.

| ID | Topic | When it matters |
|---|---|---|
| F-04 | Child profiles without login | When adding child profile UI |
| F-05 | Event owner vs creator separation | Partially done (`owner_id` exists) — complete when delegation UI is built |
| F-06 | Calendar permission semantics | When building grant/revoke UI |
| F-07 | Central auth helper consistency | `access.js` exists — revisit when delegation is live |
| F-08 | Account linking and lifecycle | When child profiles can be linked to a login |
| F-09 | Revocation behavior | When delegation UI is built |
| F-11 | Private-event policy as one contract | Partially done — complete after F-10 is fixed |
| F-14 | Schedule scan AI trust | When schedule scan feature is built |
| F-17 | Audit history | When compliance/audit requirements are defined |
