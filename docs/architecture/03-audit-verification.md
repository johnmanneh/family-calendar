# Fault Audit — Verification Status

Date: 2026-10-11 · Verified against the current `master` branch source (backend/src) · Companion to `02-fault-audit.md`

Legend: **Fixed** = confirmed in code and fixed + tested · **Confirmed** = present, not fixed yet · **Not present** · **Needs decision** = product choice required before building

## Fault register

| ID | Finding | Status | Notes |
|---|---|---|---|
| F-01 | `PUT /api/events/:id` had no authorization | **Fixed** | Loaded event must belong to the caller (creator). Update query never touches `family_id`/`created_by`. 404 for both "missing" and "not yours". |
| F-02 | Private details leak via detail / group paths | **Fixed** | `GET /events/:id` now uses the shared visibility contract (inner → "Busy" placeholder only; extended/outer/other families → 404). Group page drops private events for people not involved. Attendee & task lists require full visibility. |
| F-03 | Attendee / task / subtask endpoints lacked scope checks | **Fixed** | Add/remove attendees: event creator (attendees may remove themselves); invitees must be family or share a group. Tasks: event creator adds, assignee must be on the event or in its family; delete = task or event creator; subtasks verify parent task/event and role; standalone tasks only to own family. |
| F-04 | `users` = person + login | **Fixed** | `users` stays the person table; email/password nullable; `is_managed` + `managed_by`; DB check constraint `users_login_shape` (child profiles can never hold credentials, adults must); login refuses profiles without a login. Linking later = filling credentials on the same row (history kept) — UI not built yet. |
| F-05 | Owner vs creator conflated | **Fixed** | `events.owner_id` (backfilled = `created_by`); creator kept in `created_by`. Visibility, Busy, availability and member profiles use the owner; edit/delete via `canEditEvent`/`canDeleteEvent`. |
| F-06 | Permission semantics | **Fixed** | `calendar_permissions(owner_user_id, delegate_user_id, can_create/edit/delete)`, unique + not-self constraints, same-family checked at request time. |
| F-07 | Central helper misuse risk | **Addressed** | Narrow async checks in `utils/access.js`, fail closed on unknown actions/ids; tests prove use on every route. |
| F-08 | Account linking / lifecycle | **Partly** | Removing a child (manager/admin, confirmed) deletes its owned events; account deletion keeps events (owner/creator set NULL). Linking a child to a login: not built yet. |
| F-09 | Revocation | **Fixed** | Revoke = immediate on next request; events stay; creator attribution kept; former delegate can't edit events they created on that calendar. |
| F-10 | Group vs family vs attendee visibility | **Partly addressed** | Matrix below is now the contract in `utils/access.js` and `getEvents`. |
| F-11 | Private-event contract | **Partly addressed** | Detail, group, attendees, tasks aligned; search/notifications still to review (no search endpoint exists server-side). |
| F-12 | `ensureSchema` as migration mechanism | **Fixed** | `db/migrate.js`: versioned files, per-file transaction, checksum history, advisory lock; server won't start on a failed migration. `npm run migrate`. Back up before V003 on production. |
| F-13 | Constraints & indexes | **Confirmed (partial)** | `event_attendees` unique(event_id,user_id) exists; no index review yet. |
| F-14 | Schedule scan trust | **Fixed** | Permission checked before the AI call and again at save; photo untrusted, never stored/logged; output validated (dates, times, lengths, max 60); review before save; duplicates skipped (retry-safe). |
| F-15 | Timezone / all-day / recurrence | **Partly addressed** | Timed events stored as UTC instants; all-day = date at midnight; DST-safe availability expansion. All-day still stored as timestamp (not DATE). |
| F-16 | Concurrent edits / idempotency | **Confirmed** | No version check or idempotency keys. |
| F-17 | Audit history | **Confirmed** | Only `created_by` / `updated_by`. |
| F-18 | Response shape / error leaks | **Partly addressed** | Denials use 404 for invisible objects; many endpoints still return raw rows (`SELECT e.*`). |
| F-19 | Web/mobile drift | **Confirmed** | Clients hide Edit/Delete for non-creators; server is now authoritative for these routes. |
| F-20 | Security test matrix | **Extended** | `npm run test:security` → security (46), delegation (41), scan (19) suites. |
| F-21 | Operational hardening | **Confirmed (to review)** | `cors()` open to all origins; no rate limiting; avatars on ephemeral disk. |

## Visibility contract (implemented in `utils/access.js`)

| Viewer | Non-private event | Private event |
|---|---|---|
| Creator | full | full |
| Invited / accepted attendee | full | full |
| Family — inner circle | full | **Busy** (time only) |
| Family — extended circle | full | hidden (404) |
| Family — outer circle | hidden | hidden |
| Member of a group it's shared into | full | hidden |
| Group co-member (event not shared) | Busy block in calendar only | Busy block only |
| Anyone else | hidden (404) | hidden (404) |

## Route authorization matrix

| Route | Auth | Scope | Rule now |
|---|---|---|---|
| `GET /events` | ✔ | server-derived family + groups | visibility contract |
| `GET /events/:id` | ✔ | loaded event | contract; Busy placeholder or 404 |
| `POST /events/create` | ✔ | caller's family (server) | — |
| `PUT /events/:id` | ✔ | loaded event | creator only (**fixed**) |
| `DELETE /events/:id` | ✔ | loaded event | creator only (already) |
| `POST /events/:id/attendees` | ✔ | loaded event | creator; invitee family/group (**fixed**) |
| `DELETE /events/:id/attendees/:userId` | ✔ | loaded event | creator or self (**fixed**) |
| `GET /events/:id/attendees` | ✔ | loaded event | full visibility (**fixed**) |
| `POST /events/:id/tasks` | ✔ | loaded event | creator; assignee on event/family (**fixed**) |
| `GET /events/:id/tasks` | ✔ | loaded event | full visibility (**fixed**) |
| `DELETE /events/:id/tasks/:taskId`, `DELETE /tasks/:taskId` | ✔ | loaded task | task or event creator (**fixed**) |
| subtasks add / get / delete | ✔ | loaded task (+ parent check) | creator/assignee/event creator; view = task visibility (**fixed**) |
| `POST /tasks/standalone`, `PATCH /tasks/:taskId` | ✔ | caller's family | assignee in family (**fixed**) |
| task respond / complete / due-date / acknowledge | ✔ | loaded task | assignee/creator checks (already) |
| `POST /events/availability` | ✔ | family/group of caller | busy/free only |
| `GET /groups/:id/events` | ✔ | group membership | private filtered (**fixed**) |
| groups members / delete / remove member | ✔ | group membership/admin | already |
| `share` / `unshare` | ✔ | loaded event + group | creator + member (already) |
| family color / circle / relationship | ✔ | caller / admin's family | already |
| notifications, chat | ✔ | caller | already |

## Decisions taken (2026-10-11)

All six recommendations in `00-architecture-handoff.md` §6 were confirmed: children are managed by whoever added them + family admins; delegates edit/delete only non-private events (unless they created them); no private-details permission; revoke keeps events and attribution; removing a child deletes its events; owners are notified when someone adds to their calendar. Scan: Vormittag 08:00–11:45, Nachmittag 13:30–15:30.

## Production setup

1. **Back up the database**, then deploy — the server applies V001–V003 on start (or run `npm run migrate`).
2. Add `ANTHROPIC_API_KEY` in Railway → backend service → Variables (optional `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`). Without it, scanning answers "Scanning isn't set up yet".

## Open decisions (from 02-fault-audit §8)

Remaining open: account linking for child profiles, timezone authority per event (F-15), concurrency/version checks (F-16), audit log (F-17), response DTOs (F-18), operational hardening (F-21).
