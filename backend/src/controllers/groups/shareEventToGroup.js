const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');
const notifyUser = require('../../utils/notifyUser');

const shareEventToGroup = async (req, res) => {
  const userId = req.user.id;
  const { id: eventId } = req.params;
  const { group_id } = req.body;

  if (!group_id) return errorResponse(res, 400, 'group_id is required');

  try {
    // Verify user owns the event or is an attendee
    const event = await pool.query(
      'SELECT id, created_by FROM events WHERE id = $1',
      [eventId]
    );
    if (event.rows.length === 0) return errorResponse(res, 404, 'Event not found');
    if (Number(event.rows[0].created_by) !== Number(userId)) {
      return errorResponse(res, 403, 'Only the event creator can share it');
    }

    // Verify user is a member of the group
    const membership = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [group_id, userId]
    );
    if (membership.rows.length === 0) {
      return errorResponse(res, 403, 'You are not a member of this group');
    }

    const inserted = await pool.query(
      `INSERT INTO event_groups (event_id, group_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING RETURNING event_id`,
      [eventId, group_id]
    );
    const isNewShare = inserted.rowCount > 0;

    // Auto-invite event attendees who are not already group members and have no pending invite
    const attendees = await pool.query(
      `SELECT ea.user_id FROM event_attendees ea
       WHERE ea.event_id = $1 AND ea.user_id != $2`,
      [eventId, userId]
    );

    if (attendees.rows.length > 0) {
      const attendeeIds = attendees.rows.map(r => r.user_id);

      const alreadyIn = await pool.query(
        `SELECT user_id FROM group_members WHERE group_id = $1 AND user_id = ANY($2)`,
        [group_id, attendeeIds]
      );
      const alreadyInvited = await pool.query(
        `SELECT user_id FROM group_invitations WHERE group_id = $1 AND user_id = ANY($2)`,
        [group_id, attendeeIds]
      );

      const skip = new Set([
        ...alreadyIn.rows.map(r => r.user_id),
        ...alreadyInvited.rows.map(r => r.user_id),
      ]);

      const toInvite = attendeeIds.filter(id => !skip.has(id));
      if (toInvite.length > 0) {
        await Promise.all(
          toInvite.map(attendeeId =>
            pool.query(
              `INSERT INTO group_invitations (group_id, user_id, invited_by) VALUES ($1, $2, $3)`,
              [group_id, attendeeId, userId]
            )
          )
        );
      }
    }

    if (isNewShare) await announceShare(eventId, group_id, userId);

    return successResponse(res, 200, 'Event shared with group');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

// Tell the group: refresh every member's calendar live, and notify each member
// (except the sharer). People who are already invited as attendees got an
// invitation of their own, so they don't get a second "shared" notification.
async function announceShare(eventId, groupId, sharerId) {
  try {
    const info = await pool.query(
      `SELECT e.title, e.is_private, e.start_date, g.name AS group_name,
              u.first_name, u.last_name
       FROM events e, groups g, users u
       WHERE e.id = $1 AND g.id = $2 AND u.id = $3`,
      [eventId, groupId, sharerId]
    );
    if (info.rows.length === 0) return;
    const { title, is_private, group_name, first_name, last_name } = info.rows[0];
    const sharer = [first_name, last_name].filter(Boolean).join(' ') || 'Someone';

    const members = await pool.query(
      `SELECT gm.user_id,
              EXISTS (SELECT 1 FROM event_attendees ea
                      WHERE ea.event_id = $2 AND ea.user_id = gm.user_id) AS is_attendee
       FROM group_members gm
       WHERE gm.group_id = $1 AND gm.user_id != $3`,
      [groupId, eventId, sharerId]
    );

    // Live refresh: every family that has a member in this group
    const fams = await pool.query(
      `SELECT DISTINCT fm.family_id FROM family_members fm
       JOIN group_members gm ON gm.user_id = fm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );
    fams.rows.forEach(r => broadcast(r.family_id, 'event_update', { eventId: Number(eventId) }));

    // Private events show up as "Busy" at most — nothing to announce
    if (is_private) return;

    members.rows
      .filter(m => !m.is_attendee)
      .forEach(m => notifyUser(
        m.user_id,
        'event_shared',
        group_name,
        `${sharer} shared: ${title}`,
        { eventId: Number(eventId), groupId: Number(groupId) }
      ));
  } catch (err) {
    console.error('announceShare error:', err.message);
  }
}

module.exports = shareEventToGroup;
