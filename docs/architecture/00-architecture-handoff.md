# When — Architecture Handoff: Child Profiles, Delegated Calendars, Privacy, Schedule Scan

Status: FUTURE ROADMAP — design reviewed, partial DB schema applied to Railway (owner_id, is_managed, calendar_permissions), UI and endpoints not built yet
Stack: Expo/React Native (`mobile/`), React CRA + FullCalendar (`web/`), Node/Express + PostgreSQL on Railway (`backend/`)

---

## 1. Current architecture (relevant parts)

**People & accounts**
- `users` is the person table *and* the login account (email + password both NOT NULL).
- Every person reference points at `users.id`: family members, event attendees, task assignees, group members, colours.

**Families**
- `families` (+ `is_personal`): every user has one family row. While alone it is a hidden *personal space* (no name/code shown); it becomes a real family when the user creates one or someone joins.
- `family_members(family_id, user_id, role, color, circle_type, relationship)` — role `admin|member`; `circle_type` `inner|extended|outer` controls visibility.
- Join = move-over: a solo user's events move into the target family.

**Events**
- `events.created_by` currently means both **owner** and **creator**. `updated_by` exists.
- `event_attendees(event_id, user_id, status)` — `pending | accepted | declined`. Pending = invitation (hidden from calendar until accepted); declined stays hidden.
- `event_groups(event_id, group_id)` — sharing to a group invites every group member (pending attendee + notification).
- All times stored as UTC; server runs with `TZ=UTC`.

**Visibility rules (server-side, `getEvents`)**
- Inner circle: all family events; private events not involving the viewer → masked "Busy".
- Extended: non-private family events. Outer: only own/accepted.
- Group co-members outside the family: their booked times appear as grey **"Busy · Name"** blocks (time only).
- `POST /api/events/availability` → which people are busy in a slot (free/busy only, never details). Used to grey out busy people in "Who's attending?".

**Notifications**: `notifyUser()` = inbox row + Expo push + per-user SSE ping.

**Schema changes** are applied idempotently at server start (`utils/ensureSchema.js`).

---

## 2. Existing gaps found during review — fix FIRST

1. **`PUT /api/events/:id` has no authorization** — any signed-in user can edit any event by id (even other families).
2. **`GET /api/events/:id` leaks private events** to family members (list masks as "Busy", detail returns title/notes/attendees). Only group viewers are blocked.
3. **`GET /api/groups/:id/events`** returns private events' titles.
4. **`POST /api/events/:id/attendees`** (and attendee/task endpoints) don't verify the caller belongs to the event's family/group.

---

## 3. Feature goals

- Child profiles that belong to a family and own events **without a login**.
- Adults can authorize specific members to create/edit/delete events on their calendar.
- Every event records **whose calendar** (owner) separately from **who created it** (actor).
- Management permission never implies visibility: being able to create for someone ≠ seeing their private events.
- Scan a paper schedule (e.g. kindergarten 1–2-week plan) and add it to a chosen calendar (e.g. a child's).

---

## 4. Concept → schema mapping

| Concept | Today | Planned change |
|---|---|---|
| Person / profile | `users` row | Keep `users` as the person table |
| Login account | email + password on the same row (NOT NULL) | Make email/password nullable; add `users.is_managed` (+ `managed_by_family_id`). Managed rows can **never** authenticate (login also rejects rows without a password). Account linking later = set email/password on the same row → history preserved. |
| Family membership | `family_members` | Unchanged; children are normal members |
| Calendar owner | `events.created_by` (conflated) | Add `events.owner_id` → users.id. Migration: `owner_id = created_by` (established by data) |
| Creator / actor | `events.created_by` | Keeps meaning "who created it"; `updated_by` = last editor |
| Delegated permissions | — | New table `calendar_permissions` |
| Visibility | circles + private masking + Busy blocks | Unchanged rules, evaluated against **owner** (plus creator) |

**`calendar_permissions`**
```
id, family_id,
grantor_user_id,   -- whose calendar
grantee_user_id,   -- who may act on it
can_create BOOLEAN, can_edit BOOLEAN, can_delete BOOLEAN,
created_at, updated_at,
UNIQUE (family_id, grantor_user_id, grantee_user_id),
CHECK (grantor_user_id <> grantee_user_id)
```
No "view private details" capability for now (see decisions).

**Main risk:** `created_by` is used in ~50 places across 18 backend files (visibility, edit/delete checks, availability, busy blocks, member profiles, groups, notifications). Each use must be classified as *owner* or *creator*.

---

## 5. Authorization model (one shared helper, server-side only)

`canActOn(actorId, ownerId, action)` where action ∈ `create | edit | delete`:
1. `actorId === ownerId` → allowed.
2. Owner is a **managed child** in the actor's family and actor is the profile's manager or a family admin → allowed.
3. A `calendar_permissions` row grants the capability → allowed (edit/delete limited to non-private events unless the actor created that event).
4. Otherwise → 403.

Every route verifies: authenticated → target belongs to the expected family → `canActOn` → returned fields filtered by visibility. Client-supplied `owner_id` / `family_id` are never trusted.

---

## 6. Product decisions (recommended — to confirm)

1. **Children**: managed automatically by the profile's creator + family admins; children grant nothing. Adults: explicit grants only.
2. **Edit/delete scope for delegates**: the target's non-private events; private ones only if the delegate created them.
3. **Private details for delegates**: not offered (no permission exists).
4. **Revocation**: blocks future actions; events stay; creator attribution kept.
5. **Child profile linked to an account**: keeps everything. **Removed**: confirmation, then its owned events are deleted.
6. **Notification**: owner (if they have an account) gets "Sarah added Dentist to your calendar".

---

## 7. UX

**Family settings**
- "Add child" (name, colour, optional photo) → appears in Members with a child badge.
- Per member: "Who can add to my calendar" → toggles Create / Edit / Delete per family member, with plain explanations; revoke with confirmation. Clearly separate from "who can see my events" (circles).

**New / Edit event**
- "Create event for": *My calendar* (default) + only server-authorized members.
- Subtle note when acting for someone: "You're adding this to Leo's calendar."

**Schedule scan (🌸 in the sun menu — leaf = event, snowflake = task, flower = scan)**
- Take photo / choose from gallery → server reads it with Claude (vision) → review list (date, time or all-day, title, notes), each tickable/editable → "Add to: [person]" → Add.
- Also from a child's profile ("Scan schedule", pre-selects the child).
- Handles multi-week sheets, holidays as all-day ranges ("Herbstferien bis 18. Oktober"), "Termin zum Vormerken".
- Open: default times for *Vormittag* / *Nachmittag* (e.g. 08:00–11:45 / 13:30–15:30) or all-day notes. Needs `ANTHROPIC_API_KEY` on Railway (~1–2 cents per scan).

---

## 8. Implementation sequence

1. Fix the four gaps in §2 (with tests).
2. Child profiles: nullable email/password, `is_managed`, create/rename/remove, login hard-block.
3. `events.owner_id` + migration; classify every `created_by` use.
4. `calendar_permissions` + grant/revoke API + `canActOn` helper on create/update/delete.
5. "Create event for" in web + mobile event forms.
6. Privacy pass over every read path: list, detail, group page, member profile, availability, busy blocks, invitations, notifications, search.
7. Schedule scan endpoint + review UI (web + mobile).
8. Docs + regression tests (cross-family IDs, revoked grants, child profiles, private events, existing invite/group/task flows).

---

## 9. Acceptance criteria (summary)

- A parent can create a child profile without a login; it owns events; it can never sign in.
- Grants can be given and revoked; create/edit/delete enforced independently on the server, even with a hand-crafted request.
- Each event stores owner and creator; default target is the user's own calendar; UI shows when acting for someone.
- Delegates never see private details they couldn't see before; nothing leaks via detail, group, search, notification or error responses.
- Existing family, group, invitation, attendee, task, Busy and time-zone behaviour unchanged.

## 10. Guardrails

Follow existing code style and provider order (Auth > Family > UI > Event > Group); UIContext makes no API calls; no frontend-only permission checks; no unrelated refactors; idempotent migrations via `ensureSchema`; report files changed, migrations, tests and open decisions after each step.
