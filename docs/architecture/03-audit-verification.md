# Fault Audit — Verified Status

Date verified: 2026-10-12  
Last updated: 2026-10-12 (session 3 — reflects all fixes applied)  
Verified against: live Railway DB + `master` branch source code  
Companion to: `02-fault-audit.md`

Legend:
- **Done** — code exists, DB schema matches, migration file exists, deployed to Railway
- **In progress** — partially implemented, work ongoing
- **Verified safe** — audited and confirmed no issue exists
- **Not started** — nothing implemented
- **Not applicable** — relates to a future feature not yet built

---

## Fault register

| ID | Finding | Status | Notes |
|---|---|---|---|
| F-01 | `PUT /api/events/:id` had no authorization on local dev | **Done** | `canEditEvent()` called in `updateEvent.js`. Migration `030_add_events_owner_id.sql` written. |
| F-02 | Private details leak via detail / group paths | **Done** | `eventAccess()` + `busyView()` used in `getEvent.js`. |
| F-03 | Attendee / task / subtask endpoints lacked scope | **Done** | `taskAccess()` added to `completeTask.js` and `respondToTask.js`. All task controllers verified. |
| F-04 | `users` conflates person and login identity | **Done** | `users.is_managed` + `users.managed_by` on Railway. Migration `031_add_users_managed.sql` written. |
| F-05 | Owner vs creator conflated on events | **Done** | `events.owner_id` on Railway. Migration `030_add_events_owner_id.sql` written. |
| F-06 | Permission semantics ambiguous | **Done** | `calendar_permissions` table on Railway. Migration `032_create_calendar_permissions.sql` written. |
| F-07 | Central auth helper used inconsistently | **Done** | `utils/access.js` exists. Used in all key controllers. |
| F-08 | Account linking / profile lifecycle | **Not started** | No UI or endpoint for linking a login to a managed child profile. |
| F-09 | Revocation behavior | **Done** | `canManageCalendar()` checks live DB on every request — revoke is immediate. |
| F-10 | Group vs family vs attendee visibility | **Verified safe** | Audited `getNotifications.js` and `getMemberEvents.js`. Both already apply correct masking. |
| F-11 | Private-event policy not one testable contract | **Verified safe** | Contract applied consistently. F-10 paths verified. |
| F-12 | `ensureSchema.js` as unsafe migration mechanism | **Not applicable** | Project uses numbered SQL migration files. Not a risk. |
| F-13 | DB constraints and indexes missing locally | **Done** | All three migration files written. Local dev now matches Railway. |
| F-14 | Schedule scan trusts AI output | **Not applicable** | Feature not yet built. |
| F-15 | All-day events off by one day in non-UTC timezones | **Done** | `getEvents.js`/`getEvent.js` return `YYYY-MM-DD` for all-day dates. Mobile parsers fixed (`parseDateSafe`, `formatDate`). |
| F-16 | Concurrent edits silently overwrite | **Done** | `updateEvent.js` checks `updated_at` version. Returns 409 on mismatch. Web + mobile send version with update. |
| F-17 | Audit history underspecified | **Not started** | Only `created_by` / `updated_by` on events. No audit log table. |
| F-18 | API responses return raw DB rows | **Done** | `getEvents.js` uses explicit `eventCols` column list instead of `SELECT e.*`. |
| F-19 | Mobile screens call API directly | **In progress** | 14 screens bypass context layer. User fixing manually. |
| F-20 | No security-focused test matrix | **Done** | 17/17 tests passing. Route paths fixed, JWT_SECRET set in test env, mock reset added. |
| F-21a | Avatars on ephemeral Railway disk | **Done** | Cloudinary integration complete. `uploadAvatar.js` uses memory buffer + upload_stream. |
| F-21b | CORS open to all origins | **Done** | Restricted to `its4us.app` + `localhost:3000` in `app.js`. Deployed. |
| F-21c | No rate limiting on auth endpoints | **Done** | `express-rate-limit` on `/login`, `/register`, `/forgot-password`. Deployed. |

---

## Additional fixes applied (not in original audit)

| Fix | File(s) changed | Status |
|---|---|---|
| Deleted accounts bypass auth with saved JWT | `backend/src/middleware/auth.js` | **Done** |
| deleteAccount FK constraint errors | `backend/src/controllers/auth/deleteAccount.js` | **Done** |
| Profile color save → server error (empty string to INT column) | `backend/src/controllers/auth/updateProfile.js` | **Done** |
| Web 401 auto-logout (deleted account or expired token) | `web/src/api/axios.js`, `web/src/context/AuthContext.js` | **Done** |
| Broken avatar display after Cloudinary migration | `web/src/components/common/Avatar/Avatar.js` | **Done** |
| DateTimePicker Android crash (v9.x — inline component removed) | `mobile/src/screens/EventFormScreen.js` | **Done** |
| Android app rebuilt via EAS cloud build | EAS + Railway | **Done** |

---

## Visibility contract (as implemented in `utils/access.js`)

| Viewer | Non-private event | Private event |
|---|---|---|
| Creator / owner | full | full |
| Accepted/pending attendee | full | full |
| Family — inner circle | full | **Busy** (time only) |
| Family — extended circle | full | hidden (404) |
| Family — outer circle | hidden | hidden |
| Group member (event shared in) | full | hidden |
| Anyone else | hidden (404) | hidden (404) |

---

## Open items

**In progress**
- F-19: Mobile context layer cleanup (user doing manually)
- F-20: Run security tests and confirm passing

**Not started (lower priority)**
- F-08: Account linking UI for child profiles
- F-17: Audit log table

**Future features (not started)**
- F-04: Child profile creation UI
- F-06: Calendar delegation UI — grant/revoke permissions
- F-14: Schedule scan — photo → AI → review → save
