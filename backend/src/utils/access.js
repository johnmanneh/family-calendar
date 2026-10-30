const pool = require('../config/db');
const { withFreshAvatar } = require('./avatarStore');

/**
 * access.js — one place that decides who may see or change an event and the
 * things hanging off it (attendees, tasks, subtasks). Every route calls these
 * instead of writing its own checks. Always fail closed.
 *
 * Visibility contract — the same rules the calendar list (getEvents) uses:
 *   'full' → creator
 *            · invited or accepted attendee (not declined)
 *            · family member: inner circle (non-private), extended circle (non-private)
 *            · member of a group the event is shared into (non-private)
 *   'busy' → inner-circle family member looking at someone else's private event
 *            (only time + "Busy"; never title, notes, attendees or tasks)
 *   'none' → everyone else, incl. outer circle and other families → respond 404
 *
 * Calendar management (create / edit / delete on someone's calendar):
 *   · yourself
 *   · a child profile (managed, no login): its manager or a family admin — all actions
 *   · an adult who granted you that capability in calendar_permissions
 * Management NEVER widens visibility: a delegate sees exactly what their circle
 * already allows. Delegates may edit/delete only non-private events unless they
 * created the event themselves. Revoking a grant applies on the next request.
 */

async function loadEvent(eventId) {
  if (!/^\d+$/.test(String(eventId))) return null;
  const r = await pool.query('SELECT * FROM events WHERE id = $1', [eventId]);
  return r.rows[0] || null;
}

async function eventAccess(userId, eventOrId) {
  const event = typeof eventOrId === 'object' ? eventOrId : await loadEvent(eventOrId);
  if (!event) return { event: null, level: 'none' };

  const uid = Number(userId);
  const isCreator = Number(event.created_by) === uid;

  const r = await pool.query(
    `SELECT
       (SELECT status FROM event_attendees WHERE event_id = $1 AND user_id = $2) AS attendee_status,
       (SELECT circle_type FROM family_members WHERE family_id = $3 AND user_id = $2 LIMIT 1) AS circle,
       EXISTS (SELECT 1 FROM event_groups eg
               JOIN group_members gm ON gm.group_id = eg.group_id
               WHERE eg.event_id = $1 AND gm.user_id = $2) AS via_group`,
    [event.id, uid, event.family_id]
  );
  const { attendee_status, circle, via_group } = r.rows[0];
  const isAttendee = attendee_status === 'pending' || attendee_status === 'accepted';
  const inFamily = circle !== null && circle !== undefined;

  const isOwner = event.owner_id != null && Number(event.owner_id) === uid;
  const managesOwner = event.owner_id != null && !isOwner && await managesChild(uid, event.owner_id);

  let level = 'none';
  if (isCreator || isOwner || isAttendee || managesOwner) level = 'full';
  else if (inFamily && (circle || 'inner') === 'inner') level = event.is_private ? 'busy' : 'full';
  else if (inFamily && circle === 'extended') level = event.is_private ? 'none' : 'full';
  else if (via_group && !event.is_private) level = 'full';

  return { event, level, isCreator, isOwner, isAttendee, inFamily, circle };
}

const ACTIONS = new Set(['create', 'edit', 'delete']);

// Is `ownerId` a child profile (no login) that `actorId` manages — its creator
// or an admin of a family they share?
async function managesChild(actorId, ownerId) {
  const r = await pool.query(
    `SELECT u.is_managed, u.managed_by,
            EXISTS (SELECT 1 FROM family_members a JOIN family_members b ON b.family_id = a.family_id
                    WHERE a.user_id = $1 AND b.user_id = $2) AS same_family,
            EXISTS (SELECT 1 FROM family_members a JOIN family_members b ON b.family_id = a.family_id
                    WHERE a.user_id = $1 AND a.role IN ('admin','owner') AND b.user_id = $2) AS admin_of
     FROM users u WHERE u.id = $2`,
    [actorId, ownerId]
  );
  const o = r.rows[0];
  if (!o || !o.is_managed || !o.same_family) return false;
  return Number(o.managed_by) === Number(actorId) || o.admin_of;
}

// May `actorId` perform `action` on `ownerId`'s calendar? Fails closed.
async function canManageCalendar(actorId, ownerId, action, familyId = null) {
  if (!ACTIONS.has(action)) return false;
  if (!/^\d+$/.test(String(ownerId)) || !/^\d+$/.test(String(actorId))) return false;
  if (Number(actorId) === Number(ownerId)) return true;
  if (await managesChild(actorId, ownerId)) return true;
  const col = { create: 'can_create', edit: 'can_edit', delete: 'can_delete' }[action];
  const r = await pool.query(
    `SELECT 1 FROM calendar_permissions cp
     JOIN family_members a ON a.family_id = cp.family_id AND a.user_id = cp.owner_user_id
     JOIN family_members b ON b.family_id = cp.family_id AND b.user_id = cp.delegate_user_id
     WHERE cp.owner_user_id = $1 AND cp.delegate_user_id = $2 AND cp.${col} = true
       AND ($3::int IS NULL OR cp.family_id = $3)
     LIMIT 1`,
    [ownerId, actorId, familyId]
  );
  return r.rows.length > 0;
}

// May `actorId` edit / delete this event?
//   · its owner, or the creator of an event on their own calendar
//   · otherwise the matching calendar permission (child manager or delegate);
//     delegates only on non-private events unless they created that event
async function canChangeEvent(actorId, event, action) {
  if (!event || !ACTIONS.has(action)) return false;
  const uid = Number(actorId);
  const owner = event.owner_id != null ? Number(event.owner_id) : Number(event.created_by);
  if (owner === uid) return true;
  if (!owner) return false;
  if (await managesChild(uid, owner)) return true;
  // Management grants never widen event visibility (including an empty PUT).
  if ((await eventAccess(uid, event)).level !== 'full') return false;
  if (event.family_id == null || !(await canManageCalendar(uid, owner, action, event.family_id))) return false;
  return !event.is_private || Number(event.created_by) === uid;
}
const canEditEvent = (actorId, event) => canChangeEvent(actorId, event, 'edit');
const canDeleteEvent = (actorId, event) => canChangeEvent(actorId, event, 'delete');

// Calendars `actorId` may create events on (themself first)
async function creatableCalendars(actorId) {
  const r = await pool.query(
    `SELECT DISTINCT ON (u.id) u.id, u.first_name, u.last_name, u.avatar_url, u.is_managed,
            fm.color, (u.id = $1) AS is_self
     FROM users u
     JOIN family_members fm ON fm.user_id = u.id
     WHERE u.id = $1
        OR (u.is_managed AND fm.family_id IN (SELECT family_id FROM family_members WHERE user_id = $1)
            AND (u.managed_by = $1 OR EXISTS (
                  SELECT 1 FROM family_members ad WHERE ad.family_id = fm.family_id
                    AND ad.user_id = $1 AND ad.role IN ('admin','owner'))))
        OR EXISTS (SELECT 1 FROM calendar_permissions cp
                   JOIN family_members a ON a.family_id = cp.family_id AND a.user_id = cp.owner_user_id
                   JOIN family_members b ON b.family_id = cp.family_id AND b.user_id = cp.delegate_user_id
                   WHERE cp.owner_user_id = u.id AND cp.delegate_user_id = $1 AND cp.can_create)
     ORDER BY u.id`,
    [actorId]
  );
  return r.rows
    .map((row) => withFreshAvatar(row))
    .sort((a, b) => (b.is_self - a.is_self) || String(a.first_name).localeCompare(b.first_name));
}

// May `actorId` invite `targetId` to `event`? Same family as the event, or
// someone the actor shares a group with (what the attendee picker offers).
async function canInvite(actorId, event, targetId) {
  if (!/^\d+$/.test(String(targetId))) return false;
  if (Number(targetId) === Number(actorId)) return true;
  const r = await pool.query(
    `SELECT
       EXISTS (SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $3) AS in_family,
       EXISTS (SELECT 1 FROM group_members a JOIN group_members b ON b.group_id = a.group_id
               WHERE a.user_id = $2 AND b.user_id = $3) AS shares_group`,
    [event.family_id, actorId, targetId]
  );
  return r.rows[0].in_family || r.rows[0].shares_group;
}

// May a task on `event` be assigned to `assigneeId`? Family of the event or an attendee.
async function canAssignOnEvent(event, assigneeId) {
  if (!assigneeId) return true; // "Anyone"
  if (!/^\d+$/.test(String(assigneeId))) return false;
  const r = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $3)
         OR EXISTS (SELECT 1 FROM event_attendees WHERE event_id = $2 AND user_id = $3 AND status <> 'declined')
         OR EXISTS (SELECT 1 FROM events WHERE id = $2 AND created_by = $3) AS ok`,
    [event.family_id, event.id, assigneeId]
  );
  return r.rows[0].ok;
}

// Standalone tasks: assignee must share a family with the actor (or be the actor)
async function sharesFamily(a, b) {
  if (Number(a) === Number(b)) return true;
  if (!/^\d+$/.test(String(b))) return false;
  const r = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM family_members x JOIN family_members y ON y.family_id = x.family_id
                    WHERE x.user_id = $1 AND y.user_id = $2) AS ok`,
    [a, b]
  );
  return r.rows[0].ok;
}

// Load a task with its event; may `userId` see it?
async function taskAccess(userId, taskId) {
  if (!/^\d+$/.test(String(taskId))) return { task: null, canView: false };
  const t = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
  const task = t.rows[0];
  if (!task) return { task: null, canView: false };
  const uid = Number(userId);
  const isTaskCreator = Number(task.created_by) === uid;
  const isAssignee = Number(task.assigned_to) === uid;
  let event = null, eventLevel = 'none', isEventCreator = false;
  if (task.event_id) {
    const a = await eventAccess(uid, task.event_id);
    event = a.event; eventLevel = a.level;
    isEventCreator = !!event && await canEditEvent(uid, event);   // creator, owner, manager or delegate
  }
  const canView = isTaskCreator || isAssignee || eventLevel === 'full';
  return { task, event, canView, isTaskCreator, isAssignee, isEventCreator };
}

// Family/member listings must not expose an event's title through its tasks.
// An invitation/group membership does not move an event into another family.
async function filterListedTasks(userId, tasks, familyIds) {
  const allowed = new Set(familyIds.map(Number));
  const visible = await Promise.all(tasks.map(async task => {
    if (!task.event_id) {
      if (!task.is_standalone) return null;
      // Current memberships cannot establish a legacy task's historical scope.
      // Keep unresolved tasks hidden until their family is assigned explicitly.
      if (task.family_id == null) return null;
      return allowed.has(Number(task.family_id)) ? task : null;
    }
    const { event, level } = await eventAccess(userId, task.event_id);
    return event && allowed.has(Number(event.family_id)) && level === 'full' ? task : null;
  }));
  return visible.filter(Boolean);
}

// The minimal shape for a private event someone may only see as "Busy"
const busyView = e => ({
  id: e.id,
  start_date: e.start_date,
  end_date: e.end_date,
  is_all_day: e.is_all_day,
  recurrence: e.recurrence,
  recurrence_end_date: e.recurrence_end_date,
  title: 'Busy',
  color: '#b0b0b8',
  is_private: true,
  is_busy: true,
  attendees: [],
  tasks: [],
  group_ids: [],
});

module.exports = {
  loadEvent, eventAccess, canEditEvent, canDeleteEvent, canManageCalendar, managesChild,
  creatableCalendars, canInvite, canAssignOnEvent, sharesFamily, taskAccess, busyView, filterListedTasks,
};
