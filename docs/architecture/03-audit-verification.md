# Fault Audit — Verification Status

Date: 2026-10-11 · Verified against the current `master` branch source (backend/src) · Companion to `02-fault-audit.md`

Legend: **Fixed** = confirmed in code and fixed + tested · **Confirmed** = present, not fixed yet · **Not present** · **Needs decision** = product choice required before building

## Fault register

| ID | Finding | Status | Notes |
|---|---|---|---|
| F-01 | `PUT /api/events/:id` had no authorization | **Fixed** | Loaded event must belong to the caller (creator). Update query never touches `family_id`/`created_by`. 404 for both "missing" and "not yours". |
| F-02 | Private details leak via detail / group paths | **Fixed** | `GET /events/:id` now uses the shared visibility contract (inner → "Busy" placeholder only; extended/outer/other families → 404). Group page drops private events for people not involved. Attendee & task lists require full visibility. |
| F-03 | Attendee / task / subtask endpoints lacked scope checks | **Fixed** | Add/remove attendees: event creator (attendees may remove themselves); invitees must be family or share a group. Tasks: event creator adds, assignee must be on the event or in its family; delete = task or event creator; subtasks verify parent task/event and role; standalone tasks only to own family. |
| F-04 | `users` = person + login | **Confirmed** | Needs decision on child-profile model (see 00-architecture-handoff §4). |
| F-05 | Owner vs creator conflated (`events.created_by`) | **Confirmed** | ~50 uses in 18 files; classify before adding `owner_id`. |
| F-06 | Permission semantics | **Needs decision** | Use `owner_user_id` / `delegate_user_id` + explicit booleans (proposal). |
| F-07 | Central helper misuse risk | **Partly addressed** | `utils/access.js` has narrow functions (`eventAccess`, `canEditEvent`, `canInvite`, `canAssignOnEvent`, `taskAccess`); fails closed on unknown/invalid ids. Delegation not built yet. |
| F-08 | Account linking / lifecycle | **Needs decision** | |
| F-09 | Revocation | **Needs decision** | Recommended default in audit accepted as proposal. |
| F-10 | Group vs family vs attendee visibility | **Partly addressed** | Matrix below is now the contract in `utils/access.js` and `getEvents`. |
| F-11 | Private-event contract | **Partly addressed** | Detail, group, attendees, tasks aligned; search/notifications still to review (no search endpoint exists server-side). |
| F-12 | `ensureSchema` as migration mechanism | **Confirmed** | Idempotent DDL at startup (029, 031). No version table/rollback. Recommend versioned migrations before the owner/permission migration. |
| F-13 | Constraints & indexes | **Confirmed (partial)** | `event_attendees` unique(event_id,user_id) exists; no index review yet. |
| F-14 | Schedule scan trust | **Not built** | Review-before-save design already planned. |
| F-15 | Timezone / all-day / recurrence | **Partly addressed** | Timed events stored as UTC instants; all-day = date at midnight; DST-safe availability expansion. All-day still stored as timestamp (not DATE). |
| F-16 | Concurrent edits / idempotency | **Confirmed** | No version check or idempotency keys. |
| F-17 | Audit history | **Confirmed** | Only `created_by` / `updated_by`. |
| F-18 | Response shape / error leaks | **Partly addressed** | Denials use 404 for invisible objects; many endpoints still return raw rows (`SELECT e.*`). |
| F-19 | Web/mobile drift | **Confirmed** | Clients hide Edit/Delete for non-creators; server is now authoritative for these routes. |
| F-20 | Security test matrix | **Started** | `backend/tests/security.test.js` — 46 checks (cross-family, guessed ids, private leaks, circles, tampered parents, regression). |
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

## Open decisions (from 02-fault-audit §8)

All 12 remain open; recommendations are in `00-architecture-handoff.md` §6. Phase 2+ (child profiles, owner/creator split, delegation, scan) should not start until they are confirmed.
