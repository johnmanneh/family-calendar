const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const respondToEventInvitation = async (req, res) => {
  const userId = req.user.id;
  const { id: eventId } = req.params;
  const { response } = req.body; // 'accepted' | 'denied'

  if (!['accepted', 'denied'].includes(response)) {
    return errorResponse(res, 400, 'response must be accepted or denied');
  }

  try {
    const invitation = await pool.query(
      `SELECT id FROM event_attendees WHERE event_id = $1 AND user_id = $2 AND status = 'pending'`,
      [eventId, userId]
    );

    if (invitation.rows.length === 0) {
      return errorResponse(res, 404, 'Pending invitation not found');
    }

    if (response === 'accepted') {
      await pool.query(
        `UPDATE event_attendees SET status = 'accepted' WHERE event_id = $1 AND user_id = $2`,
        [eventId, userId]
      );
    } else {
      // Denied — remove from attendees entirely
      await pool.query(
        `DELETE FROM event_attendees WHERE event_id = $1 AND user_id = $2`,
        [eventId, userId]
      );
    }

    return successResponse(res, 200, `Invitation ${response}`);
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = respondToEventInvitation;
