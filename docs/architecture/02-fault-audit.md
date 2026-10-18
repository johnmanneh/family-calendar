# When — Architecture Fault Audit

Date: 2026-10-12  
Last updated: 2026-10-12 (session 3 — all P0/P1 fixed, P2 in progress)  
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
**Severity:** P0 → **FIXED**  
`PUT /api/events/:id` uses `canEditEvent()` from `utils/access.js`, which depends on `events.owner_id`. Migration file `030_add_events_owner_id.sql` written — local dev now in sync with Railway.

---

### F-03 — Attendee and task endpoints need scope check audit
**Severity:** P0 → **FIXED**  
`completeTask.js` and `respondToTask.js` were missing `taskAccess()` calls. Both now call `taskAccess()` before any DB mutation, confirming family membership and assignee status.

---

### F-13 — Missing migration files for Railway schema changes
**Severity:** P0 → **FIXED**  
Three migration files written to match what was already on Railway:

| Migration | What it documents |
|---|---|
| `030_add_events_owner_id.sql` | `events.owner_id` column + FK + index |
| `031_add_users_managed.sql` | `users.is_managed`, `users.managed_by` + check constraint |
| `032_create_calendar_permissions.sql` | `calendar_permissions` table + constraints + indexes |

---

### F-21a — Avatars stored on ephemeral Railway disk
**Severity:** P0 → **FIXED**  
`uploadAvatar.js` now uses Cloudinary (`multer.memoryStorage` + `upload_stream`). Photos stored under `avatars/avatar-{userId}` with `overwrite: true` — survives deploys. `Avatar.js` fixed to handle absolute Cloudinary URLs (no longer prepends `BACKEND_URL` to `http://` URLs).

---

### F-10 — Visibility contract not applied to all read paths
**Severity:** P1 → **VERIFIED SAFE**  
Audited `getNotifications.js` and `getMemberEvents.js`. Both already safe:
- Notifications use explicit column list — no raw event data
- `getMemberEvents.js` applies correct Busy masking for private events

No code change required.

---

### F-18 — Many endpoints return raw DB rows
**Severity:** P1 → **FIXED**  
`getEvents.js` now uses an explicit `eventCols` column list instead of `SELECT e.*` in all three circle-type branches and the group events query. Prevents future columns from automatically leaking to clients.

---

### F-21b — CORS open to all origins
**Severity:** P1 → **FIXED**  
`app.js` now uses `cors({ origin: ['https://its4us.app', 'https://www.its4us.app', 'http://localhost:3000'], credentials: true })`.

---

### F-21c — No rate limiting on auth endpoints
**Severity:** P1 → **FIXED**  
`express-rate-limit` installed. `routes/auth.js` applies `authLimiter` (10 requests / 15 min) to `/login`, `/register`, `/forgot-password`.

---

### F-15 — All-day events stored as timestamp, not DATE
**Severity:** P2 → **FIXED**  
No DB schema change needed. Fix applied at the API layer:
- `getEvents.js` and `getEvent.js` now return `YYYY-MM-DD` (date-only string) for all-day `start_date`/`end_date` instead of a UTC ISO timestamp.
- Mobile `EventDetailsScreen.js`: `formatDate()` now parses `YYYY-MM-DD` as local midnight (`new Date(y, m-1, d)`) to avoid UTC shift.
- Mobile `EventFormScreen.js`: `parseDateSafe()` helper added — edit form now initialises date pickers correctly in all timezones.

---

### F-16 — No concurrency protection on event updates
**Severity:** P2 → **FIXED**  
Optimistic concurrency added to `PUT /api/events/:id`:
- Clients send `updated_at` (the version they last saw) with every update.
- Server compares against DB value — returns `409 Conflict` if mismatched.
- Web `EventModal.js` sends `selectedEvent.extendedProps.updated_at`.
- Mobile `EventFormScreen.js` sends `event.updated_at`.

---

### F-19 — Mobile screens call API directly (context layer bypassed)
**Severity:** P2 → **In progress (manual)**  
All 14 mobile screens call `API` directly instead of going through context. User is fixing this manually screen by screen. No deadline set.

---

### F-20 — No security test suite
**Severity:** P2 → **FIXED**  
17/17 tests passing. Covers:
- Unauthenticated requests → 401
- Tampered / deleted-user JWTs → 401
- Cross-family event ID guessing → 404
- Private event title must not leak
- Non-assignee cannot complete a task → 404
- Rate-limit headers present on auth endpoints

---

## Additional fixes (not in original audit)

### DateTimePicker Android crash
**Fixed:** v9.x of `@react-native-community/datetimepicker` deprecated the inline component on Android. `EventFormScreen.js` now uses `DateTimePickerAndroid.open()` (imperative API) on Android; iOS keeps the inline component. Required a fresh EAS cloud build to register the updated native module.

### Auth middleware — deleted accounts still valid
**Fixed:** `auth.js` now does a DB lookup (`SELECT 1 FROM users WHERE id = $1`) after JWT verification. Deleted accounts return 401 even with a valid token.

### deleteAccount FK constraint errors
**Fixed:** `deleteAccount.js` now NULLs all FK references (`events.updated_by`, `families.created_by`, `groups.created_by`, `tasks.assigned_to`, `tasks.last_counter_by`, `messages`, `notifications`) before deleting the user row.

### Profile color save server error
**Fixed:** `updateProfile.js` now handles the `color` field. Empty strings sanitized to `null` before sending to PostgreSQL integer columns.

### Web 401 auto-logout
**Fixed:** `web/src/api/axios.js` now has a response interceptor. Any 401 on a non-auth call triggers `onUnauthorized()` → `AuthContext` clears the session and redirects to login.

---

## Future feature faults (not applicable until feature is built)

| ID | Topic | When it matters |
|---|---|---|
| F-04 | Child profiles without login | When adding child profile UI |
| F-05 | Event owner vs creator separation | Partially done (`owner_id` exists) — complete when delegation UI is built |
| F-06 | Calendar permission semantics | When building grant/revoke UI |
| F-07 | Central auth helper consistency | `access.js` exists — revisit when delegation is live |
| F-08 | Account linking and lifecycle | When child profiles can be linked to a login |
| F-09 | Revocation behavior | When delegation UI is built |
| F-11 | Private-event policy as one contract | Partially done — complete after F-10 verified |
| F-14 | Schedule scan AI trust | When schedule scan feature is built |
| F-17 | Audit history | When compliance/audit requirements are defined |
