# Multiple families — status and open gaps

Status: built (another session, 19 Oct 2026, commits 4cb4863 … 7b5614e, "Phase 1–6").
Reviewed 19 Oct 2026; gaps 1–3 below **fixed the same night** (commit 4128b8d + the UI commit after it). This doc records what exists, what's missing, and what must be fixed
before anyone really uses two families.

## What's built

- **Migration V008** (`backend/src/db/migrations/V008__active_family.sql`):
  `family_members.is_active BOOLEAN`, plus a unique index so a user has at most one active family.
  When nothing is active, the server falls back to the largest family.
- **Endpoints:**
  - `GET /api/family/all` — all families of the user, active first.
  - `PATCH /api/family/active { family_id }` — switch the active family.
  - `POST /api/family/join` — joining **keeps** the old family (no longer moves you out).
  - `DELETE /api/family/leave { family_id }` — leave one specific family.
  - `POST /api/family/create` — allows a second family when you're already in one.
- **Uses the active family:** events list (`getEvents`), creating events (`createEvent`),
  tasks (`getFamilyTasks`), family info (`getFamily`).
- **Mobile:** FamilyContext has `families` + `switchFamily`; Home has a family switcher
  (FamilyFilterBar); Family screen lists "My families" with an **Active** badge, Leave per family,
  and "Join with code".
- **Web:** FamilyContext `families` / `switchFamily`; family chips in the sidebar; Leave in the sidebar.

## Gaps found

### 1. Still used "largest family" instead of the active family (bug) — ✅ fixed

These controllers still pick the family with the most members. If the active family is the smaller
one, the action lands in the **wrong family**:

| Area | File | Effect |
|---|---|---|
| Add / edit / remove child | `controllers/family/children.js` | Child is created in the other family |
| Pickup people | `controllers/family/pickupPeople.js` | List and new people belong to the other family |
| Rename family | `controllers/family/renameFamily.js` | Renames the other family |
| Scan import (owner colour) | `controllers/scan/scan.js` | Colour looked up in the other family |
| Open one event | `controllers/events/getEvent.js` | Access check against the other family |
| Live updates (SSE) | `controllers/stream/streamConnect.js` | Subscribes to the other family's updates |

**Fix:** one shared helper, e.g. `utils/activeFamily.js` →
`activeFamily(userId)` = the family with `is_active = true`, else the largest one. Use it in all
places above (and in the ones that already inline this logic) so there is a single rule.
Add tests: a user in two families, active = the smaller one → child, pickup person, rename, scan
and SSE all go to the active family.

### 2. No "Create family" once you're in a family (missing UI) — ✅ fixed

- Mobile (`FamilyScreen.js`) and web (`SidebarFamily.js`) only show **Create a family** while the
  user has no family yet (`personal`). After joining or creating one, there is no way to create a
  second family, even though `POST /family/create` allows it.
- **Fix:** under "My families", next to **Join with code**, add **Create a family** (name field →
  create → it becomes the active family). Same on web.

### 3. "Leave family" placement (UX) — ✅ fixed

- Mobile: the red **Leave Family …** button sits inside the family card in the middle of the
  screen. It should be at the **bottom**, in a separated "danger zone", below Join / Create.
- Suggested order on the Family screen: you + children → Pickup people → My families (switch,
  Active badge) → **Join with code · Create a family** → *Danger zone:* Leave [active family].

## How it was fixed

- `backend/src/utils/activeFamily.js` holds the one rule (`ACTIVE_FAMILY_ORDER`); every controller
  that picks "the user's family" uses it. Opening a single event prefers the event's own family when
  the user is in it (e.g. opened from a notification while another family is active).
- Live updates (SSE) subscribe to **all** of the user's families, so switching needs no reconnect.
- `backend/tests/multifamily.test.js` (10 checks): user in a big and a small family, small one
  active → child, pickup person, rename, new event all go to the active family; switching moves them.
- Mobile Family screen: My families (Active badge / Switch) → Join with code · **Create a family**
  → **Danger zone** with Leave per family at the bottom. Web sidebar: **Create another family**
  next to Join another family.

## Open questions for John

- What should happen to the **active** family when you leave it? (Today: falls back to the largest.)
- Should children, pickup people and groups be **per family** (current data model) — e.g. a child
  shared by two families (separated parents) would need to exist in both?
