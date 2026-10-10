const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const unshareEventFromGroup = async (req, res) => {
  const userId = req.user.id;
  const { id: eventId, groupId } = req.params;

  try {
    const event = await pool.query('SELECT created_by FROM events WHERE id = $1', [eventId]);
    if (event.rows.length === 0) return errorResponse(res, 404, 'Event not found');
    if (Number(event.rows[0].created_by) !== Number(userId)) {
      return errorResponse(res, 403, 'Only the event creator can unshare it');
    }

    await pool.query(
      'DELETE FROM event_groups WHERE event_id = $1 AND group_id = $2',
      [eventId, groupId]
    );

    // Withdraw invitations nobody answered yet that came through this group
    // (unless the person is still reachable through another group it's shared with)
    await pool.query(
      `DELETE FROM event_attendees ea
       WHERE ea.event_id = $1 AND ea.status = 'pending'
         AND ea.user_id IN (SELECT user_id FROM group_members WHERE group_id = $2)
         AND NOT EXISTS (
           SELECT 1 FROM event_groups eg
           JOIN group_members gm ON gm.group_id = eg.group_id
           WHERE eg.event_id = $1 AND gm.user_id = ea.user_id
         )`,
      [eventId, groupId]
    );

    return successResponse(res, 200, 'Event unshared from group');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = unshareEventFromGroup;
