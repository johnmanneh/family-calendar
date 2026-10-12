# Fault Audit — Verified Status

Date verified: 2026-10-12  
Verified against: live Railway DB + `master` branch source code  
Companion to: `02-fault-audit.md`

Legend:
- **Done** — code exists AND DB schema matches AND migration file exists
- **Code done / no migration** — logic is in the codebase and on Railway, but no SQL migration file exists locally (local dev DB is out of sync)
- **Partial** — some work done, gaps remain
- **Not started** — nothing implemented
- **Not applicable** — relates to a future feature not yet built

---

## Fault register

| ID | Finding | Status | Notes |
|---|---|---|---|
| F-01 | `PUT /api/events/:id` had no authorization | **Code done / no migration** | `canEditEvent()` in `utils/access.js` is called in `updateEvent.js`. Works on Railway. No migration for `events.owner_id` exists locally. |
| F-02 | Private details leak via detail / group paths | **Code done / no migration** | `eventAccess()` + `busyView()` used in `getEvent.js`. Works on Railway. Depends on `events.owner_id` — no migration. |
| F-03 | Attendee / task / subtask endpoints lacked scope | **Partial** | `canInvite()`, `canAssignOnEvent()`, `taskAccess()` exist in `access.js`. Needs verification that every attendee/task controller actually calls them. |
| F-04 | `users` conflates person and login identity | **Code done / no migration** | `users.is_managed` + `users.managed_by` exist on Railway with correct check constraint. No migration file locally. |
| F-05 | Owner vs creator conflated on events | **Code done / no migration** | `events.owner_id` column exists on Railway, backfilled, indexed + FK. No migration file locally. |
| F-06 | Permission semantics ambiguous | **Code done / no migration** | `calendar_permissions` table exists on Railway with correct columns, constraints + indexes. No migration file locally. |
| F-07 | Central auth helper used inconsistently | **Done** | `utils/access.js` exists. Fails closed on unknown actions. Used in `updateEvent.js`, `getEvent.js`. |
| F-08 | Account linking / profile lifecycle | **Not started** | No UI or endpoint for linking a login to a managed child profile. |
| F-09 | Revocation behavior | **Done** | `canManageCalendar()` checks live DB on every request — revoke is immediate. No cached permissions. |
| F-10 | Group vs family vs attendee visibility | **Partial** | Visibility contract exists in `access.js`. Not verified across every read path (notifications, member profile events). |
| F-11 | Private-event policy not one testable contract | **Partial** | Contract is defined in `access.js`. Not yet applied to notifications payload or member profile event list. |
| F-12 | `ensureSchema.js` as unsafe migration mechanism | **Not applicable** | Project uses numbered SQL migration files — no `ensureSchema.js` exists. Not a risk. |
| F-13 | DB constraints and indexes missing | **Partial** | `calendar_permissions` has proper constraints. `events.owner_id` has FK + index. `event_attendees` unique(event_id, user_id) exists. Full index audit not done. |
| F-14 | Schedule scan trusts AI output | **Not applicable** | Schedule scan feature does not exist yet. |
| F-15 | Timezone / all-day / recurrence inconsistency | **Partial** | Timed events stored UTC. All-day stored as timestamp (not DATE type). DST edge cases not tested. |
| F-16 | Concurrent edits / duplicate submissions | **Not started** | No version field or idempotency keys. Two users editing the same event simultaneously will silently overwrite. |
| F-17 | Audit history underspecified | **Not started** | Only `created_by` / `updated_by` on events. No audit log table. |
| F-18 | API responses leak private info / raw rows | **Partial** | 404 used for invisible objects (good). Many endpoints still return `SELECT e.*` raw rows instead of explicit field allowlists. |
| F-19 | Web and mobile clients can drift | **Partial** | Server is now authoritative for edit/delete. Mobile screens still call API directly (bypassing context layer — separate cleanup task). |
| F-20 | No security-focused test matrix | **Not started** | No test files exist. No `npm run test:security`. |
| F-21 | Operational hardening not reviewed | **Confirmed gaps** | CORS open to all origins. No rate limiting. Avatars stored on ephemeral Railway disk (wiped on each deploy — known bug, fix = Cloudinary). |

---

## The single biggest issue

**DB schema changes were applied directly to Railway without creating migration files.**

The following exist in the Railway database but have NO corresponding migration file in `backend/src/config/migrations/`:

| Schema change | Expected migration |
|---|---|
| `events.owner_id` column + FK + index | `030_add_events_owner_id.sql` |
| `users.is_managed` + `users.managed_by` + check constraint | `031_add_users_managed.sql` |
| `calendar_permissions` table + constraints + indexes | `032_create_calendar_permissions.sql` |

**Impact:** Local dev DB is out of sync with Railway. Anyone setting up locally or if Railway is ever rebuilt will be missing these tables/columns and the app will break.

**Fix:** Write the three migration files to match exactly what's on Railway — no changes to the data, just documenting what already exists.

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

## Open items by priority

**P0 — Fix before going live**
- Write migration files for `owner_id`, `is_managed/managed_by`, `calendar_permissions` (local dev broken without these)
- Fix avatars on ephemeral disk → Cloudinary
- Verify F-03: confirm every attendee/task controller calls `access.js` checks

**P1 — Fix soon**
- Apply visibility contract to notifications payload (F-11)
- Apply visibility contract to member profile event list (F-10)
- Add CORS restriction to known origins (F-21)
- Add rate limiting to auth endpoints (F-21)

**P2 — Plan for later**
- Account linking UI for child profiles (F-08)
- Explicit field allowlists on API responses instead of `SELECT *` (F-18)
- Timezone: change all-day events to DATE type (F-15)
- Concurrency: `updated_at` version check on event update (F-16)
- Security test suite (F-20)

**Future feature (not started)**
- Child profile creation UI (F-04)
- Calendar delegation UI — grant/revoke permissions (F-06)
- Schedule scan — photo → AI → review → save (F-14)
- Audit log table (F-17)
