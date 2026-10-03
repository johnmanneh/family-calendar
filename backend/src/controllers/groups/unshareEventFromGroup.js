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

    return successResponse(res, 200, 'Event unshared from group');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = unshareEventFromGroup;
