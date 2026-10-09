# 📋 "When" Family Calendar App — Complete Project Summary

---

## 🏗️ Project Overview

| Key | Value |
|-----|-------|
| App name | **"When"** — inspired by Ecclesiastes 3:1 |
| GitHub | `johnmanneh/family-calendar` |
| Backend | Express.js (port 8000), PostgreSQL |
| Frontend | React (port 3000) |
| Test credentials | `james@test.com` / `123456` (user_id: 3, family_id: 1, invite_code: `2O7ZRI`) |
| DB credentials | `johnmanneh` as PostgreSQL superuser, `family_admin` as app user |

---

## 🗄️ Database Schema

### Tables

| Table | Key Columns |
|-------|-------------|
| `users` | id, email, password, first_name, last_name, age, address, occupation, avatar_url, created_at |
| `families` | id, name, invite_code, created_by, created_at |
| `family_members` | id, family_id, user_id, role, color, circle_type, relationship, created_at |
| `events` | id, title, description, start_date, end_date, family_id, created_by, updated_by, updated_at, location, is_all_day, is_private, recurrence, recurrence_end_date, reminder, second_reminder, color, category, priority, url, notes, travel_time, video_call_link, status |
| `event_attendees` | id, event_id, user_id, status (pending/accepted), created_at |
| `groups` | id, name, invite_code, family_id, created_by, created_at |
| `group_members` | id, group_id, user_id, role, joined_at |
| `event_groups` | id, event_id, group_id, created_at |
| `group_invitations` | id, group_id, user_id, invited_by, status (pending/accepted/denied), created_at |
| `tasks` | id, event_id, assigned_to, title, position, is_standalone, due_date, completed, created_by, created_at, status, counter_offer, creator_acknowledged, last_counter_by, assignee_acknowledged |
| `sub_tasks` | id, task_id, title, created_at |

### Migrations

| File | Change |
|------|--------|
| `001_update_users.sql` | Initial users table |
| `002_remove_name_column.sql` | Split name → first_name, last_name |
| `003_add_event_columns.sql` | Extended event columns |
| `004_create_event_attendees.sql` | event_attendees table |
| `005_add_color_family_members.sql` | color column on family_members |
| `006_create_tasks.sql` | tasks table |
| `007_create_subtasks.sql` | sub_tasks table |
| `008_standalone_tasks.sql` | is_standalone, due_date to tasks |
| `009_add_created_by_tasks.sql` | created_by to tasks |
| `010_add_updated_by_events.sql` | updated_by, updated_at to events |
| `011_add_circle_type.sql` | circle_type to family_members (inner/outer) |
| `012_add_private_events.sql` | is_private to events |
| `013_add_avatar_url.sql` | avatar_url to users |
| `014_add_relationship.sql` | relationship to family_members |
| `015_create_groups.sql` | groups + group_members tables |
| `016_create_event_groups.sql` | event_groups table |
| `017_create_group_invitations.sql` | group_invitations table |
| `018_event_attendee_status.sql` | status column on event_attendees |
| `019_add_task_completed.sql` | completed boolean on tasks (default false) |
| `020_add_task_status.sql` | status, counter_offer, creator_acknowledged on tasks |
| `021_add_task_last_counter_by.sql` | last_counter_by on tasks — tracks whose turn it is in negotiation |
| `022_add_assignee_acknowledged.sql` | assignee_acknowledged on tasks — notifies User B when counter accepted |
| `023_task_event_id_set_null.sql` | tasks.event_id FK changed to ON DELETE SET NULL (was CASCADE) |
| `024_add_push_token.sql` | push_token column on users |
| `025_create_notifications.sql` | notifications table (id, user_id, type, title, body, data JSONB, is_read, created_at) |
| `026_create_messages.sql` | messages table (id, family_id, user_id, body, created_at) for family chat |
| `028_merge_solo_families.sql` | data migration — merges solo families when a user joins a larger one |

### Grant Permissions (run after every migration)
```sql
GRANT ALL PRIVILEGES ON TABLE [table] TO family_admin;
GRANT USAGE, SELECT ON SEQUENCE [table]_id_seq TO family_admin;
```

---

## 🔧 Backend Structure

```
backend/src/
├── app.js                          (serves /uploads as static, all routes)
├── config/
│   ├── db.js
│   └── migrations/
├── middleware/
│   └── auth.js                     (verifyToken — Bearer token + ?token= query param for SSE)
├── routes/
│   ├── auth.js
│   ├── events.js
│   ├── family.js
│   ├── tasks.js
│   └── stream.js                   (GET /api/stream — SSE endpoint)
├── controllers/
│   ├── stream/
│   │   └── streamConnect.js        (keeps connection open, registers in sseClients, 30s heartbeat)
│   ├── auth/
│   │   ├── register.js
│   │   ├── login.js
│   │   ├── me.js                   (returns avatar_url)
│   │   ├── updateProfile.js
│   │   └── uploadAvatar.js         (multer — POST /auth/avatar, saves to /uploads/avatars/)
│   ├── events/
│   │   ├── createEvent.js          (saves is_private, is_all_day, recurrence; broadcasts event_update;
│   │   │                            resolves family by member count DESC — multi-family safe)
│   │   ├── getEvents.js            (circle_type aware — inner sees all, outer sees own;
│   │   │                            private events masked as Busy for inner non-members;
│   │   │                            Busy mask includes created_by + attendee IDs;
│   │   │                            also fetches cross-family events shared into user's groups, tagged from_group=true;
│   │   │                            resolves family by member count DESC — multi-family safe)
│   │   ├── getEvent.js             (allows access if event is in user's family OR shared into a group they're in;
│   │   │                            resolves family by member count DESC — multi-family safe)
│   │   ├── deleteEvent.js          (broadcasts event_update)
│   │   └── eventAttendee/
│   │       ├── addAttendee.js
│   │       ├── removeAttendee.js
│   │       └── getAttendees.js         (includes ea.status so frontend can show accepted ring)
│   ├── family/
│   │   ├── createFamily.js
│   │   ├── joinFamily.js           (invite code uppercased — case-insensitive join)
│   │   ├── getFamily.js            (returns avatar_url + circle_type per member;
│   │   │                            resolves family by member count DESC — multi-family safe)
│   │   ├── updateMemberColor.js
│   │   ├── updateMemberCircle.js   (admin only — toggle inner/outer)
│   │   ├── getMemberEvents.js
│   │   └── getMemberTasks.js       (LEFT JOIN — includes standalone tasks, excludes completed)
│   └── tasks/
│       ├── addTask.js              (status=pending unless self-assigned → accepted; broadcasts task_update)
│       ├── getTasks.js             (LEFT JOIN sub_tasks — groups subtasks; includes status, counter_offer, due_date)
│       ├── deleteTask.js
│       ├── getMyTasks.js           (7-day window, accepted tasks only, excludes completed)
│       ├── getPendingTasks.js      (tasks assigned to me with status=pending + cascaded subtasks)
│       ├── respondToTask.js        (PATCH — accept / decline / counter; accepts counter renames latest sub-task if present; broadcasts task_update)
│       ├── getTaskNotifications.js (tasks I created where assignee declined/countered, unacknowledged)
│       ├── acknowledgeTaskResponse.js (PATCH — creator dismisses a declined/countered notification)
│       ├── getAssigneeNotifications.js (tasks where my counter was accepted, includes due_date)
│       ├── updateTaskDueDate.js    (PATCH — assignee sets arrival time; auto-saves via debounce)
│       ├── completeTask.js         (PATCH — marks task completed, only own tasks; broadcasts task_update)
│       ├── createStandaloneTasks.js
│       └── subtasks/
│           ├── addSubTask.js
│           ├── getSubTasks.js
│           └── deleteSubTask.js
└── utils/
    ├── response/
    │   └── responseHandlers.js     (successResponse, errorResponse — NOTE: uses ...data spread, so fields land at top level of response)
    ├── sseClients.js               (in-memory store: familyId → Set of connections; broadcast())
    ├── insertNotification.js       (fire-and-forget INSERT into notifications; never crashes caller)
    └── sendPush.js                 (POST to exp.host/api/v2/push/send for Expo push notifications)
uploads/
└── avatars/                        (profile photos stored here)
```

### API Routes

```
AUTH
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/profile
POST   /api/auth/avatar              (multipart/form-data, field: "avatar", 5MB max)
DELETE /api/auth/account             (delete own account + cleanup)

FAMILY
GET    /api/family
POST   /api/family/create
POST   /api/family/join
PUT    /api/family/member/color
PUT    /api/family/member/circle     (admin only — body: { user_id, circle_type })
GET    /api/family/members/:userId/events
GET    /api/family/members/:userId/tasks

EVENTS
GET    /api/events
GET    /api/events/my-tasks          (7-day window)
GET    /api/events/:id
POST   /api/events/create
PUT    /api/events/:id
DELETE /api/events/:id
POST   /api/events/:id/attendees
DELETE /api/events/:id/attendees/:userId
GET    /api/events/:id/attendees
POST   /api/events/:id/tasks
GET    /api/events/:id/tasks
DELETE /api/events/:id/tasks/:taskId
POST   /api/events/:id/tasks/:taskId/subtasks
GET    /api/events/:id/tasks/:taskId/subtasks
DELETE /api/events/:id/tasks/:taskId/subtasks/:subTaskId

TASKS
POST   /api/tasks/standalone
GET    /api/tasks/pending             (tasks assigned to me, status=pending)
GET    /api/tasks/notifications       (task responses I need to see as creator)
PATCH  /api/tasks/:taskId/complete
PATCH  /api/tasks/:taskId/respond     (body: { response: accepted|declined|countered, counter_offer? })
PATCH  /api/tasks/:taskId/acknowledge          (creator dismisses a declined/countered notification)
GET    /api/tasks/assignee-notifications        (tasks where my counter was accepted — unacknowledged)
PATCH  /api/tasks/:taskId/assignee-acknowledge  (User B dismisses accepted counter notification)
PATCH  /api/tasks/:taskId/due-date              (assignee sets arrival time — body: { due_date })

GROUPS
POST   /api/groups/create
POST   /api/groups/join
GET    /api/groups
GET    /api/groups/invitations
PUT    /api/groups/invitations/:id
DELETE /api/groups/:id                (admin only)
GET    /api/groups/:id/events
GET    /api/groups/:id/members        (NEW — full member list with name/avatar/role)
DELETE /api/groups/:id/members/:userId (NEW — admin only, cannot remove self or other admins)
POST   /api/groups/events/:id/share
DELETE /api/groups/events/:id/share/:groupId

JOIN (unified)
POST   /api/join                      (NEW — single endpoint: joins family or group by invite code)

EVENT INVITATIONS
GET    /api/events/invitations
PUT    /api/events/invitations/:id

NOTIFICATIONS
GET    /api/notifications            (last 50, newest first — fields: notifications[], unread_count)
PATCH  /api/notifications/read-all  (mark all read for current user)
PATCH  /api/notifications/:id/read  (mark single notification read)

CHAT
GET    /api/chat                     (last 50 messages oldest-first — fields: messages[])
POST   /api/chat                     (send message — body: { body }; broadcasts chat_message SSE; returns message object in message field)

SSE
GET    /api/stream                   (persistent SSE connection — token via ?token= query param)

STATIC
GET    /uploads/avatars/:filename    (served directly by Express)
```

---

## ⚛️ Frontend Structure

```
web/src/
├── api/
│   └── axios.js                    (baseURL: http://localhost:8000/api, Bearer token interceptor)
├── context/
│   ├── AuthContext.js              (user, token, authLoading, login, logout — restores via /auth/me; authLoading blocks render until session resolved)
│   ├── FamilyContext.js            (family, members, fetchFamily — restores on token change)
│   ├── EventContext.js             (ALL API calls live here; owns SSE connection — one per session)
│   ├── UIContext.js                (ALL state lives here)
│   ├── AppProviders.js            (Auth > Family > UI > Event > Group)
│   └── GroupContext.js             (groups, invitations, create/join/delete, share/unshare, respondToInvitation)
├── pages/
│   ├── login/Login.js
│   ├── register/Register.js        (create/join family inline)
│   ├── dashboard/Dashboard.js
│   └── member/
│       ├── MemberProfile.js        (photo upload, color picker, circle toggle, profile info)
│       └── MemberColors.js         (18 colors)
├── components/
│   ├── common/
│   │   ├── Avatar/
│   │   │   └── Avatar.js           (shows photo if avatar_url, else coloured initials)
│   │   ├── PrivateRoute.js         (shows loading screen during auth restore; redirects to /login if no token)
│   │   ├── Button/Button.js        (variant, loading, className)
│   │   ├── Input/Input.js
│   │   └── AuthLink/AuthLink.js
│   └── calendar/
│       ├── Sidebar/
│       │   ├── Sidebar.js          (tasks hidden only when viewing another member)
│       │   ├── SidebarFamily.js
│       │   ├── SidebarMembers.js   (avatar bubbles + person-icon → profile; member tasks for others only)
│       │   ├── SidebarTasks.js     (own tasks — ✓ done button, Pending badge for undated; TimeRoller on tasks assigned by others)
│       │   ├── SidebarGroups.js    (groups list, create/join, admin delete, invitations)
│       │   ├── SidebarPending.js   (pending event invitations + pending tasks with cascading subtasks
│       │   │                        + task response notifications for creator — positioned after Members)
│       │   ├── SidebarNotifications.js (collapsible inbox — unread badge, mark one/all read)
│       │   ├── SidebarChat.js      (collapsible family group chat — live via SSE chat_message;
│       │   │                        date mentions tappable → opens event creation modal)
│       │   ├── Categories.js
│       │   └── Sidebar.css
│       ├── CalendarView/
│       │   ├── CalendarView.js     (rrule plugin, member filter, busy block rendering,
│       │   │                        date click defaults to current time)
│       │   └── CalendarView.css
│       ├── EventDetails/
│       │   ├── EventDetails.js
│       │   ├── EventDetailsEmpty.js
│       │   ├── EventDetailsView.js
│       │   └── EventDetails.css
│       ├── EventDetails/
│       │   ├── EventDetailsView.js  (task badges; arrival time inline attribute; updates via SSE)
│       └── EventModal/
│           ├── EventModal.js       (toggle switches for All Day + Private;
│           │                        All Day auto-strips/restores time;
│           │                        defaults start to now, end to now+1h)
│           ├── StandaloneTaskModal.js
│           └── EventModal.css
└── utils/
    ├── dateUtils.js                (formatDate, formatTime, formatDateTime)
    └── dataUtils.js                (sanitizeData, emptyForm, mapEventToForm)
```

---

## 🧠 Context Architecture

### Rules
- **UIContext** — owns ALL state, zero API calls
- **EventContext** — owns ALL API calls, reads state from UIContext
- No prop drilling — consume context directly in child components
- UIContext wraps EventContext so EventContext can read UI state

### UIContext state (finalised)
```js
loading, error
events, selectedEvent
attendees, selectedAttendees
isEventModalOpen, isTaskModalOpen, isViewModalOpen, isEditMode
selectedDate, modalTasks, subTaskInputs
selectedMember, memberTasks
tasks, myTasks
pendingTasks, taskNotifications
```

### Key UIContext functions
| Function | Notes |
|----------|-------|
| `openNewEvent(date)` | sets edit=false, opens modal |
| `openEditEvent()` | sets edit=true, opens modal |
| `closeEventModal()` | resets edit + selectedDate |
| `toggleMember(member)` | deselects if same, selects if different — **do not add setSelectedMember after calling** |
| `toggleAttendee(userId)` | adds/removes from selectedAttendees |
| `resetModal()` | clears selectedAttendees + modalTasks |

---

## 🔒 Privacy Circles

| Circle | Sees |
|--------|------|
| **inner** | ALL family events; private events from non-members show as grey 🔒 Busy |
| **outer** | Only events they created or attend; private events invisible |

### Busy block rules
- `created_by` is preserved in Busy mask (so member filter works)
- `attendees` contains IDs only (no names/colors) so filter works for all attendees
- Busy blocks are not clickable in the calendar

### Admin controls
- Admin can toggle any other member's circle type via their Settings tab
- Admin cannot change their own circle type

---

## 👤 Profile Photos

- Stored in `backend/uploads/avatars/`
- Served at `http://localhost:8000/uploads/avatars/:filename`
- Uploaded via `POST /api/auth/avatar` (multipart, field: `avatar`, max 5MB)
- `avatar_url` stored in `users` table (relative path)
- `Avatar` component: shows photo if available, coloured initials otherwise
- Used in: sidebar member bubbles, MemberProfile hero, modal attendees

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary color | `--btn-color: #1a8fa8` |
| Font | Inter |
| App name display | "when" |
| Theme | Ecclesiastes 3:1 — seasons logo 🌸☀️🍂❄️ |

### Member Colors (18 — `MemberColors.js`)
```js
export const MEMBER_COLORS = [
  { color: '#e17055' }, { color: '#74b9ff' }, { color: '#55efc4' },
  // ... 15 more
];
```

### Categories (`Categories.js`)
```js
export const CATEGORIES = [
  { name: 'Family',  icon: '🏠', color: '#56e39f' },
  { name: 'School',  icon: '🏫', color: '#4facfe' },
  { name: 'Sports',  icon: '⚽', color: '#c8f400' },
  { name: 'Health',  icon: '🏥', color: '#f48c06' },
  { name: 'Travel',  icon: '✈️', color: '#9747ff' },
  { name: 'Social',  icon: '🎉', color: '#ffd60a' },
  { name: 'Faith',   icon: '⛪', color: '#1a8fa8' },
  { name: 'Work',    icon: '💼', color: '#6e6e73' },
];
```

---

## 📐 Key Patterns & Rules

| Rule | Detail |
|------|--------|
| Container/View | `EventDetails.js` → View + Empty; `Sidebar.js` → Family + Members + Tasks |
| API calls | Always in EventContext, never in components |
| State | Always in UIContext |
| Migrations | Never drop tables — always add columns |
| Permissions | Always GRANT after migration |
| Sanitize | `sanitizeData()` converts `""` → `null` before API calls |
| IDs | Always compare with `Number()` — DB returns strings sometimes |
| Button vs button | `<Button />` for submits/CTAs; `<button>` for nav/icons |
| Exports | Arrays/constants → named; Components → default |
| is_private UPDATE | Use `$n` directly (not COALESCE) so false is saved correctly |

---

## ✅ Completed Steps

| Step | Feature | Status |
|------|---------|--------|
| 1–8 | Auth, Family, Events, Tasks, Subtasks, Dashboard | ✅ Done |
| 9 | Visual task overlay — member avatar bubbles on calendar events | ✅ Done |
| 10 | Recurring events (rrule), All Day toggle, member filter | ✅ Done |
| 11 | Privacy Circles — circle_type, private events, Busy masking | ✅ Done |
| — | Profile photos — upload, Avatar component, sidebar display | ✅ Done |
| — | EventModal toggle switches (All Day + Private) | ✅ Done |
| — | Member settings icon (person SVG) on sidebar bubbles | ✅ Done |
| — | Date click defaults to current time | ✅ Done |
| — | Sidebar: current user auto-selected on load, home icon, member-color avatar ring, 3-column grid | ✅ Done |
| — | Event details: Apple-style redesign — clean SVG icons, grouped rows, #f2f2f7 background | ✅ Done |
| — | Sidebar + event details: unified #f2f2f7 background | ✅ Done |
| — | Sidebar: tightened spacing between invite code and Members section | ✅ Done |
| — | MemberProfile: skeleton, tab fade, scoped errors, centering fixes | ✅ Done |
| 12 | 🌍 Extended Family Network — extended circle type, relationship labels, 3-way circle picker | ✅ Done |
| 13 | 🏈 External Groups — create/join groups, share events, group invitations (accept/deny) | ✅ Done |
| — | Event invitations — attendees get pending invite, accept before event appears on calendar | ✅ Done |
| — | Delete account — Danger Zone in settings, cleans up all user data | ✅ Done |
| 14 | Task completion — ✓ done button, Pending badge, completed filtered from sidebar | ✅ Done |
| — | Group delete — admin trash icon with confirm, cascades all related data | ✅ Done |
| — | Sidebar polish — flat hover rows, accent bars, consistent pill buttons, fade-on-hover | ✅ Done |
| — | Auth hardening — protected routes, authLoading state, logout clears history, login/register redirect if already authed | ✅ Done |
| — | Sidebar fix — Number() ID comparison so tasks/pending always show for current user | ✅ Done |
| — | Attendee status ring — accepted attendees show color ring in event details panel | ✅ Done |
| — | Completed tasks hidden in member profile view — getMemberTasks filters completed | ✅ Done |
| 15 | 📋 Task negotiation — pending/accepted/declined/countered flow for event-assigned tasks | ✅ Done |
| — | Task pending section — assigned user sees task + cascading subtasks in sidebar pending section | ✅ Done |
| — | Counter offer — assignee can propose alternative (e.g. "I'll bring bread"), creator notified | ✅ Done |
| — | Task notifications — creator sees declined/countered responses, dismisses with ✓ | ✅ Done |
| — | Event details task badges — Pending / Declined / Countered badges + counter offer text shown to creator | ✅ Done |
| — | Sidebar layout fixed — Pending section moved below Members so family/members never shift position | ✅ Done |
| — | Self-assigned tasks skip pending — status auto-set to accepted when creator = assignee | ✅ Done |
| — | Task cascade under event — tasks fold under their event invitation in Apple folder style | ✅ Done |
| — | Orphan tasks (no event invitation) shown as plain task cards — no event info leaked | ✅ Done |
| — | getPendingTasks LEFT JOIN fix — tasks with null created_by no longer silently dropped | ✅ Done |
| — | Task assign dropdown — only shows selected event attendees; disabled with hint if none selected | ✅ Done |
| — | Removing an attendee clears their task assignments in the modal automatically | ✅ Done |
| — | Back-and-forth counter negotiation — either party can counter until one accepts | ✅ Done |
| — | Task title updates to accepted counter offer text on acceptance | ✅ Done |
| — | User B notified (green card) when their counter is accepted — title refreshes in sidebar | ✅ Done |
| — | Creator adding themselves as attendee auto-accepts — no pending notification shown | ✅ Done |
| — | Event hidden from calendar until invitation accepted — inner/extended circle fix | ✅ Done |
| — | Right panel clears on user switch — selectedEvent reset on fetchEvents | ✅ Done |
| — | respondToTask bug fix — counter_offer was not fetched before accepting, title never updated | ✅ Done |
| — | Stale pending task fix — accepted tasks filtered out via assigneeNotifications cross-reference | ✅ Done |
| 16 | ⏱️ Arrival time — assignee sets arrival time via TimeRoller; creator sees it inline on task | ✅ Done |
| — | TimeRoller — compact Apple-style drum roller; debounced auto-save (800ms); no calendar refresh on roll | ✅ Done |
| — | Arrival time attribute — shown inline on task meta line: `Sarah · developer · arrival 12:44` | ✅ Done |
| — | EventDetailsView receives task updates via SSE — no polling needed | ✅ Done |
| — | deleteEvent now deletes all tasks (not converts to standalone) — clean cascade | ✅ Done |
| — | getTasks includes due_date so arrival time is always returned to the frontend | ✅ Done |
| — | getAssigneeNotifications includes due_date + LEFT JOIN events (handles deleted events) | ✅ Done |
| — | getMyTasks returns created_by ID — TimeRoller uses ID comparison (not name) for reliability | ✅ Done |
| 17 | 🖱️ Double-click event to open edit modal | ✅ Done |
| — | dateClick guard — no longer fires when clicking on an existing event | ✅ Done |
| — | Edit modal date pre-fill — local timezone used (not UTC); all-day returns date-only string | ✅ Done |
| — | Sub-task counter — accepting a counter renames the latest sub-task, not the parent task | ✅ Done |
| — | addSubTask resets task to pending for any non-pending status (accepted, declined, countered) | ✅ Done |
| — | SidebarPending orphan tasks now show counter offer text (was missing) | ✅ Done |
| — | SidebarPending fetches once on mount — SSE handles live updates from there | ✅ Done |
| — | respondToCounter replaced fetchEvents with targeted fetchPendingTasks (no longer clears right panel) | ✅ Done |
| — | fetchPendingTasks uses cache-busting param to prevent stale HTTP responses | ✅ Done |
| 18 | 📡 Real-time SSE — replace polling with server-sent events | ✅ Done |
| — | `GET /api/stream` — persistent SSE endpoint, auth via `?token=` query param | ✅ Done |
| — | `sseClients.js` — in-memory store: `familyId → Set of connections` + `broadcast()` | ✅ Done |
| — | `task_update` broadcast on addTask, respondToTask, completeTask | ✅ Done |
| — | `event_update` broadcast on createEvent, updateEvent, deleteEvent | ✅ Done |
| — | EventContext opens one SSE connection on mount; dispatches fetches on incoming events | ✅ Done |
| — | `selectedEventRef` — ref tracks current event so SSE handler avoids stale closure | ✅ Done |
| — | `visibilitychange` reconnects SSE when tab returns to focus | ✅ Done |
| — | Polling (`setInterval`) removed from SidebarPending and EventDetailsView | ✅ Done |
| — | `fetchEvents` slimmed — no longer fetches tasks/notifications (SSE owns those) | ✅ Done |
| 19 | 📱 Mobile app — Expo / React Native | ✅ Done |
| 19.1 | SSE real-time — SSEContext, react-native-sse, AppState reconnect, eventTick/taskTick | ✅ Done |
| 19.2 | Arrival time — DateTimePicker drum roller, PATCH /tasks/:id/due-date, live update | ✅ Done |
| 19.3 | Avatar + profile edit — expo-image-picker, FormData POST /auth/avatar, first/last name fields | ✅ Done |
| — | axios.js: SERVER_URL split from BASE_URL so avatar relative paths resolve correctly | ✅ Done |
| — | Avatar component: photo if available, coloured initials otherwise, camera badge when editable | ✅ Done |
| 19.4 | Drawer menu completion | ✅ Done |
| — | DrawerMenu: real avatar photo in user section | ✅ Done |
| — | DrawerMenu: Pending nav item with red badge count from HomeScreen | ✅ Done |
| — | DrawerMenu: Family nav item | ✅ Done |
| — | FamilyScreen: family name + invite code, member list with photos, leave family button | ✅ Done |
| — | Backend: DELETE /api/family/leave (blocked for owners) | ✅ Done |
| 19.5 | Push notifications — Expo push, APNs/FCM via Expo service | ✅ Done |
| — | Migration 024: push_token column on users | ✅ Done |
| — | PUT /api/auth/push-token — saves device token | ✅ Done |
| — | sendPush utility — posts to exp.host/api/v2/push/send | ✅ Done |
| — | addTask: push to assignee when task assigned pending | ✅ Done |
| — | respondToTask: push to other party on accept/decline/counter | ✅ Done |
| — | registerPushToken: dynamic require guards Expo Go (no native module init) | ✅ Done |
| — | AuthContext: calls registerPushToken on login and session restore | ✅ Done |
| 20 | 📱 Mobile parity | ✅ Done |
| — | PendingScreen: event invitations + cascading tasks + task negotiation + assignee notifications | ✅ Done |
| — | EventDetailsScreen: subtask add inline (creator or assignee only) | ✅ Done |
| — | MemberProfileScreen: admin circle control (inner/extended/outer) | ✅ Done |
| — | DayViewScreen: long-press a time slot → EventForm with that hour pre-filled | ✅ Done |
| — | EventFormScreen: accepts optional `date` route param to pre-fill start time | ✅ Done |
| N | 🔔 Notifications inbox | ✅ Done |
| — | Migration 025: notifications table with type, title, body, data JSONB, is_read | ✅ Done |
| — | insertNotification utility: fire-and-forget, wired into addTask + respondToTask + addAttendee | ✅ Done |
| — | GET/PATCH /api/notifications — fetch history + mark one/all read | ✅ Done |
| — | Web: SidebarNotifications — collapsible, unread badge, mark read on click | ✅ Done |
| — | Mobile: NotificationsScreen — FlatList, pull to refresh, coloured dot per type | ✅ Done |
| — | Mobile: HomeScreen bell badge = pendingCount + notifUnread (combined) | ✅ Done |
| — | Mobile: NotificationsScreen accessible from header bell + drawer | ✅ Done |
| 21 | 💬 Family Chat | ✅ Done |
| — | Migration 026: messages table (family_id, user_id, body, created_at) | ✅ Done |
| — | GET /api/chat — last 50 messages oldest-first with sender name + color + avatar | ✅ Done |
| — | POST /api/chat — insert + broadcast chat_message SSE event to family | ✅ Done |
| — | SSE: chat_message event added to web EventContext (onChatMessage callback ref) | ✅ Done |
| — | SSE: chat_message event added to mobile SSEContext (lastChatMsg state) | ✅ Done |
| — | Web: SidebarChat — collapsible panel, iMessage-style bubbles, Enter to send | ✅ Done |
| — | Mobile: ChatScreen — FlatList bubbles, paper-plane send, keyboard-avoiding input | ✅ Done |
| — | Date mentions in chat tappable — parseDateMentions utility detects "25 Dec at 3pm" etc. | ✅ Done |
| — | Tapping a date on mobile → EventForm pre-filled; on web → event creation modal | ✅ Done |
| — | Unread chat badge on HomeScreen header icon; clears on opening Chat | ✅ Done |
| — | Web SidebarChat toggle shows unread badge when panel is closed | ✅ Done |
| 22 | 🌑 Dark mode — web + mobile | ✅ Done |
| — | Mobile: `theme/index.js` — LIGHT/DARK palette (`bg`, `surface`, `surface2`, `border`, `text`, `textSub`, `textMuted`, `icon`, `bubble`) | ✅ Done |
| — | Mobile: `make(c)` factory pattern — every style file pre-computes light + dark sheets; `useStyles()` picks via `useColorScheme()` | ✅ Done |
| — | Mobile screens updated: HomeScreen, EventFormScreen, EventDetailsScreen, PendingScreen, MemberProfileScreen, TaskFormScreen, GroupsScreen, NotificationsScreen, ChatScreen, LoginScreen, DayViewScreen, FamilyScreen | ✅ Done |
| — | DayViewScreen + FamilyScreen: inline `StyleSheet.create` extracted to separate `*.styles.js` files | ✅ Done |
| — | Web: `index.css` dark palette via `@media (prefers-color-scheme: dark)` — overrides `--bg`, `--card`, `--text-primary`, `--input-bg`, `--border`, `--surface`, `--surface2`, `--separator` | ✅ Done |
| — | Web CSS files with dark mode blocks: Dashboard, Sidebar, CalendarToolbar, CalendarView, EventModal, EventDetails, MemberProfile, Login, Register, GroupPage, Input, Button | ✅ Done |
| 23 | 📅 Export to device calendar — EventDetailsScreen "Add to Calendar" button | ✅ Done |
| — | Uses `expo-calendar` — requests permission, finds primary writable calendar, calls `Calendar.createEventAsync()` | ✅ Done |
| — | Exports title, start/end dates, all-day flag, location, notes | ✅ Done |
| 24 | 👨‍👩‍👧 Multi-family context fix | ✅ Done |
| — | `getEvents`, `getEvent`, `createEvent`, `getFamilyTasks`, `getFamily` — all resolve family by member count DESC + LIMIT 1 | ✅ Done |
| — | Users in multiple families (e.g. own solo family + joined family) always land in the largest/shared one | ✅ Done |
| — | `joinFamily.js` — invite code uppercased server-side; case-insensitive join | ✅ Done |
| 25 | 🔗 Cross-family group events | ✅ Done |
| — | `getEvents` fetches events from other families shared into user's groups; returned tagged `from_group: true` | ✅ Done |
| — | `getEvent` allows viewing a single event if it lives in another family but was shared into a group the user is in | ✅ Done |
| — | Private events stay hidden even through group share (unless creator or accepted attendee) | ✅ Done |
| 26 | 📱 Mobile group improvements | ✅ Done |
| — | `GET /groups/:id/members` — new endpoint returns full member list with name/avatar/color/role | ✅ Done |
| — | GroupsScreen GroupDetail: shows member list with initials avatars + admin badge | ✅ Done |
| — | GroupsScreen GroupDetail: useFocusEffect re-fetches on screen focus (stale data fix) | ✅ Done |
| — | GroupsScreen GroupDetail: Delete group button (admin only) — confirms, cascades, navigates back | ✅ Done |
| — | `DELETE /groups/:id/members/:userId` — admin-only remove member endpoint | ✅ Done |
| — | GroupsScreen GroupDetail: red remove icon on each non-admin member row (admin view only) | ✅ Done |
| 27 | 🏠 Mobile family join | ✅ Done |
| — | JoinFamilyScreen — new standalone screen: code input → POST /family/join → fetchFamily | ✅ Done |
| — | FamilyScreen: "Join a Family" button navigates to JoinFamilyScreen | ✅ Done |
| — | App.js: JoinFamily screen registered in navigator | ✅ Done |
| 28 | 🌙 Manual dark/light mode toggle | ✅ Done |
| — | `ThemeContext.js` — stores override in SecureStore, defaults to system theme, exports `useColorScheme()` + `useToggleTheme()` | ✅ Done |
| — | All 13 style files import `useColorScheme` from ThemeContext instead of react-native | ✅ Done |
| — | `theme/index.js` `useThemeColors` also uses ThemeContext | ✅ Done |
| — | DrawerMenu App section: sun/moon icon toggle switch — tapping flips mode and persists | ✅ Done |
| 29 | 🎭 Drawer redesign | ✅ Done |
| — | Floating card (position absolute, rounded 24, shadow) instead of full-height panel | ✅ Done |
| — | Drum-roll open animation: rotateY + translateX + scale spring | ✅ Done |
| — | RollRow: each section rolls in sequentially (rotateX + fade + rise) on open | ✅ Done |
| — | Sectioned layout: Calendar, Family & Groups, App (dark mode toggle + sign out) | ✅ Done |
| — | Backdrop with animated opacity; tap to close | ✅ Done |
| 30 | ✅ Task flow improvements | ✅ Done |
| — | TaskFormScreen: Accept/Decline buttons call PATCH /tasks/:id/respond correctly | ✅ Done |
| — | TaskFormScreen: Done button calls PATCH /tasks/:id/complete (not /respond) | ✅ Done |
| — | TaskFormScreen: status badge shows "Ongoing" (green) after accept, "Done" after complete | ✅ Done |
| — | TaskFormScreen: header shows no Save button when task is ongoing (accepted) | ✅ Done |
| — | HomeScreen: useFocusEffect re-fetches on screen focus; taskTick also calls fetchEvents | ✅ Done |
| 31 | 🧱 Shared UI components — `mobile/src/components/ui/` | ✅ Done |
| — | `TopCard` — floating rounded card (24px radius, shadow) wraps every screen's header row; theme-aware background | ✅ Done |
| — | `ListCard` — reusable list row: coloured left stripe, title + subtitle, optional badge pill or right slot; pressable or static | ✅ Done |
| — | `SectionHeader` — uppercase spaced label exported from ListCard; theme-aware muted colour | ✅ Done |
| — | GroupsScreen header migrated to use `<TopCard>` — consistent floating card style across screens | ✅ Done |

---

## ✅ Completed Roadmap

All planned steps complete.

| Step | Feature |
|------|---------|
| 22 | Event search / filters — web CalendarToolbar + mobile search panel, cross-date search when active |
| 23 | Recurring events on mobile — recurrence picker already in EventFormScreen; details screen shows 🔁 row |
| 24 | Offline support — AsyncStorage cache, stale-while-revalidate on mount, offline banner with "last updated X min ago" |

---

## 📡 Real-time Architecture

```
Mutation happens
       ↓
   Backend controller
       ↓  broadcast(familyId, eventName, data)
   sseClients.js store
       ↓
  All connected family members (SSE)
```

**SSE events:**
| Event | Triggered by | Frontend action |
|-------|-------------|-----------------|
| `task_update` | addTask, respondToTask, completeTask | fetchPendingTasks + fetchTaskNotifications + fetchAssigneeNotifications + fetchTasks |
| `event_update` | createEvent, updateEvent, deleteEvent | fetchEvents |
| `chat_message` | POST /api/chat | Web: onChatMessage callback appends to SidebarChat; Mobile: lastChatMsg state appends to ChatScreen + increments chatUnread badge |

**Connection details:**
- `GET /api/stream?token=<jwt>` — token in query param (EventSource cannot set headers)
- Heartbeat every 30s to prevent proxy timeouts
- On `onerror` → connection closed, ref cleared
- On `visibilitychange` (tab focus) → reconnects if connection was lost

**Mobile (Step 19):**
- APNs (iOS) / FCM (Android) for push notifications when app is backgrounded
- `push_token` column needed on `users` table before mobile build
- Backend sends push on mutation to family members without an active SSE connection

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| `errorResponse is not a function` | Check import in controller |
| Permission denied for table | Run GRANT command |
| `my-tasks` 404 | Route order — put before `/:id` |
| FullCalendar not refreshing | `id: String(event.id)` |
| `substring is not a function` | `new Date(event.start).toISOString().substring(0,16)` |
| Uncontrolled input warning | Add `value = ''` default to Input.js |
| UIProvider undefined | UIProvider must wrap EventProvider in AppProviders |
| 304 cached response | Add `?t=${Date.now()}` to API call |
| `toggleMember` not setting member | `setSelectedMember(member)` is in UIContext — do not call it again after `toggleMember` |
| Back button returns to dashboard after logout | Use `navigate('/login', { replace: true })` on logout to replace history entry |
| Tasks/pending not shown on refresh | `SidebarMembers` auto-select depends on `[members, user]` — user loads async via `/auth/me` |
| Dashboard accessible without auth | Wrap protected routes in `<PrivateRoute>` — checks token + authLoading before rendering |
| `isViewModalOpen` missing | Add state + `openViewEvent` / `closeViewModal` to UIContext |
| `fetchEvents` unused parameter | Remove `eventData` param — just `async ()` |
| Busy not showing for inner circle | `is_private` was missing from INSERT — now saved correctly |
| Busy filtered out by member filter | Busy mask now includes `created_by` + attendee IDs |
| `is_private` not saving on update | Use `is_private = $n` directly (not COALESCE) in UPDATE |
| All Day validation warning | Toggle handler strips/restores time from date values |
| Pending tasks not showing | `JOIN users ON t.created_by` drops tasks where created_by IS NULL — use LEFT JOIN |
| Event info leaking before acceptance | Do not render event header for orphan tasks — only cascade tasks under a real pending invitation |
| Task cascade not rendering | Tasks only cascade under events where a matching pending invitation exists for that user |
| Task assigned to removed attendee | Removing an attendee in the modal clears their task assignments — prevent orphaned assignments |
| Task title not updating on counter accept | `respondToTask` was not selecting `counter_offer` in the pre-fetch query — add it to SELECT |
| Accepted task still shows in pending | `pendingTasks` state stale after creator accepts — filter out IDs present in `assigneeNotifications` |
| Creator sees pending notification for own event | `addAttendee` always set status=pending — check if attendee is creator and set accepted instead |
| Event visible before acceptance (inner circle) | Inner circle query had no invitation filter — add NOT EXISTS check for pending invitations |
| Task status column missing | Run migration `020_add_task_status.sql` |
| task status values | `pending` / `accepted` / `declined` / `countered` — counter requires counter_offer text |
| SSE not receiving events | Check `?token=` param is present; verify `verifyToken` middleware reads `req.query.token` |
| `res.data.data` is undefined for new endpoints | `successResponse` uses `...data` spread — fields land at top level. Read `res.data.fieldName` directly, not `res.data.data.fieldName` |
| Chat messages not appearing after send | Optimistic append from POST response (`res.data.message`); SSE delivers to other users. Never wait for SSE bounce-back for own messages |
| fetchEvents called too many times on load | React Strict Mode double-runs effects in dev — normal; in prod it fires once |
| John can't see James's events/tasks | User is in multiple families — `getEvents`/`getFamily`/etc had no ORDER BY; fix: order family_members by COUNT DESC LIMIT 1 |
| Family join case-sensitive (code not found) | `joinFamily.js` was missing `.toUpperCase()` — fixed server-side |
| Group detail shows stale events after adding one | `GroupDetail` useEffect only ran on mount; fix: `useFocusEffect` re-fetches on screen focus |
| `useColorScheme` override not persisting | Use `ThemeContext` not react-native's `useColorScheme`; stored in SecureStore |
| Dark mode toggle doesn't affect DrawerMenu | DrawerMenu.styles.js was using static styles — converted to theme-aware `make(c)` pattern |
| Duplicate import crashes screen | Check for duplicate `import { useFocusEffect }` lines after edits — causes immediate crash |
| Backend changes not live on mobile | Mobile hits Railway (production) — always push to GitHub to deploy; local changes have no effect |
| Duplicate API calls on page load | `fetchEvents` previously fetched tasks/notifications inline — now removed, SSE handles those |
| SSE stale closure (wrong event's tasks fetched) | Use `selectedEventRef.current` inside SSE handler, not `selectedEvent` directly |
