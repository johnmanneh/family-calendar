const pool = require('../config/db');

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
 * Changing an event (edit, delete, attendees, tasks) is for the event's
 * creator. Delegated calendar permissions will extend canEditEvent later.
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

  let level = 'none';
  if (isCreator || isAttendee) level = 'full';
  else if (inFamily && (circle || 'inner') === 'inner') level = event.is_private ? 'busy' : 'full';
  else if (inFamily && circle === 'extended') level = event.is_private ? 'none' : 'full';
  else if (via_group && !event.is_private) level = 'full';

  return { event, level, isCreator, isAttendee, inFamily, circle };
}

// Only the creator changes an event (current product rule)
const canEditEvent = (userId, event) => !!event && Number(event.created_by) === Number(userId);

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
    event = a.event; eventLevel = a.level; isEventCreator = !!a.isCreator;
  }
  const canView = isTaskCreator || isAssignee || eventLevel === 'full';
  return { task, event, canView, isTaskCreator, isAssignee, isEventCreator };
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
  loadEvent, eventAccess, canEditEvent, canInvite, canAssignOnEvent,
  sharesFamily, taskAccess, busyView,
};
