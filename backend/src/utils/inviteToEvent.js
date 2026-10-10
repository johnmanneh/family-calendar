const pool = require('../config/db');
const notifyUser = require('./notifyUser');

/**
 * inviteToEvent — adds people as *pending* attendees and notifies them.
 * Used when an event is shared into a group: every member gets a normal
 * invitation (Accept / Decline) and it only lands in their calendar once
 * they accept. People already on the event (pending or accepted) are skipped.
 *
 * @returns {number[]} the user ids that were newly invited
 */
async function inviteToEvent(eventId, userIds, inviterId, groupName = null) {
  const ids = [...new Set(userIds.map(Number))].filter(id => id && id !== Number(inviterId));
  if (ids.length === 0) return [];

  const inserted = await pool.query(
    `INSERT INTO event_attendees (event_id, user_id, status)
     SELECT $1, u, 'pending' FROM unnest($2::int[]) AS u
     WHERE NOT EXISTS (SELECT 1 FROM event_attendees ea WHERE ea.event_id = $1 AND ea.user_id = u)
     RETURNING user_id`,
    [eventId, ids]
  );
  const invited = inserted.rows.map(r => Number(r.user_id));
  if (invited.length === 0) return [];

  const info = await pool.query(
    `SELECT e.title, u.first_name, u.last_name
     FROM events e, users u WHERE e.id = $1 AND u.id = $2`,
    [eventId, inviterId]
  );
  const { title, first_name, last_name } = info.rows[0] || {};
  const inviter = [first_name, last_name].filter(Boolean).join(' ') || 'Someone';
  const body = `${inviter} invited you to: ${title}` + (groupName ? ` · ${groupName}` : '');

  invited.forEach(uid => notifyUser(uid, 'event_invited', 'Event invitation', body, { eventId: Number(eventId) }));
  return invited;
}

/**
 * inviteNewGroupMember — someone just joined a group: invite them to the
 * group's upcoming events, the same way the existing members were.
 */
async function inviteNewGroupMember(groupId, userId) {
  try {
    const rows = await pool.query(
      `SELECT e.id, e.created_by, g.name
       FROM event_groups eg
       JOIN events e ON e.id = eg.event_id
       JOIN groups g ON g.id = eg.group_id
       WHERE eg.group_id = $1 AND COALESCE(e.end_date, e.start_date) >= NOW()`,
      [groupId]
    );
    for (const r of rows.rows) {
      await inviteToEvent(r.id, [userId], r.created_by, r.name);
    }
  } catch (err) {
    console.error('inviteNewGroupMember error:', err.message);
  }
}

module.exports = { inviteToEvent, inviteNewGroupMember };
