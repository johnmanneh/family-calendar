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
| `tasks` | id, event_id, assigned_to, title, position, is_standalone, due_date, created_by, created_at |
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
│   └── auth.js                     (verifyToken — Bearer token)
├── routes/
│   ├── auth.js
│   ├── events.js
│   ├── family.js
│   └── tasks.js
├── controllers/
│   ├── auth/
│   │   ├── register.js
│   │   ├── login.js
│   │   ├── me.js                   (returns avatar_url)
│   │   ├── updateProfile.js
│   │   └── uploadAvatar.js         (multer — POST /auth/avatar, saves to /uploads/avatars/)
│   ├── events/
│   │   ├── createEvent.js          (saves is_private, is_all_day, recurrence)
│   │   ├── getEvents.js            (circle_type aware — inner sees all, outer sees own;
│   │   │                            private events masked as Busy for inner non-members;
│   │   │                            Busy mask includes created_by + attendee IDs)
│   │   ├── getEvent.js
│   │   ├── updateEvent.js          (saves is_private explicitly — no COALESCE)
│   │   ├── deleteEvent.js
│   │   └── eventAttendee/
│   │       ├── addAttendee.js
│   │       ├── removeAttendee.js
│   │       └── getAttendees.js
│   ├── family/
│   │   ├── createFamily.js
│   │   ├── joinFamily.js
│   │   ├── getFamily.js            (returns avatar_url + circle_type per member)
│   │   ├── updateMemberColor.js
│   │   ├── updateMemberCircle.js   (admin only — toggle inner/outer)
│   │   ├── getMemberEvents.js
│   │   └── getMemberTasks.js       (LEFT JOIN — includes standalone tasks)
│   └── tasks/
│       ├── addTask.js
│       ├── getTasks.js             (LEFT JOIN sub_tasks — groups subtasks)
│       ├── deleteTask.js
│       ├── getMyTasks.js           (7-day window, includes standalone)
│       ├── createStandaloneTasks.js
│       └── subtasks/
│           ├── addSubTask.js
│           ├── getSubTasks.js
│           └── deleteSubTask.js
└── utils/
    └── response/
        └── responseHandlers.js     (successResponse, errorResponse)
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

GROUPS
POST   /api/groups/create
POST   /api/groups/join
GET    /api/groups
GET    /api/groups/invitations
PUT    /api/groups/invitations/:id
GET    /api/groups/:id/events
POST   /api/groups/events/:id/share
DELETE /api/groups/events/:id/share/:groupId

EVENT INVITATIONS
GET    /api/events/invitations
PUT    /api/events/invitations/:id

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
│   ├── AuthContext.js              (user, token, login, logout, restores via /auth/me)
│   ├── FamilyContext.js            (family, members, fetchFamily — restores on token change)
│   ├── EventContext.js             (ALL API calls live here)
│   ├── UIContext.js                (ALL state lives here)
│   └── AppProviders.js            (Auth > Family > UI > Event)
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
│   │   ├── Button/Button.js        (variant, loading, className)
│   │   ├── Input/Input.js
│   │   └── AuthLink/AuthLink.js
│   └── calendar/
│       ├── Sidebar/
│       │   ├── Sidebar.js          (logout button only — gear removed)
│       │   ├── SidebarFamily.js
│       │   ├── SidebarMembers.js   (avatar bubbles + person-icon → profile; member task panel)
│       │   ├── SidebarTasks.js
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

---

## ⏳ Remaining Roadmap

| Step | Feature |
|------|---------|
| 14 | 🔔 Push Notifications — real-time alerts for invites, event reminders |
| 15 | 📱 Mobile-responsive layout |

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
| `isViewModalOpen` missing | Add state + `openViewEvent` / `closeViewModal` to UIContext |
| `fetchEvents` unused parameter | Remove `eventData` param — just `async ()` |
| Busy not showing for inner circle | `is_private` was missing from INSERT — now saved correctly |
| Busy filtered out by member filter | Busy mask now includes `created_by` + attendee IDs |
| `is_private` not saving on update | Use `is_private = $n` directly (not COALESCE) in UPDATE |
| All Day validation warning | Toggle handler strips/restores time from date values |
