const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');
const { inviteToEvent } = require('../../utils/inviteToEvent');

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

// Sharing into a group = inviting the group. Every member (except the sharer)
// becomes a pending attendee and gets a normal invitation — Accept puts it in
// their calendar, Decline drops it. Calendars refresh live either way.
async function announceShare(eventId, groupId, sharerId) {
  try {
    const g = await pool.query('SELECT name FROM groups WHERE id = $1', [groupId]);
    const members = await pool.query(
      'SELECT user_id FROM group_members WHERE group_id = $1 AND user_id != $2',
      [groupId, sharerId]
    );
    await inviteToEvent(eventId, members.rows.map(r => r.user_id), sharerId, g.rows[0]?.name);

    const fams = await pool.query(
      `SELECT DISTINCT fm.family_id FROM family_members fm
       JOIN group_members gm ON gm.user_id = fm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );
    fams.rows.forEach(r => broadcast(r.family_id, 'event_update', { eventId: Number(eventId) }));
  } catch (err) {
    console.error('announceShare error:', err.message);
  }
}

module.exports = shareEventToGroup;
