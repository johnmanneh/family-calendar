const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getPendingEventInvitations = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT e.id, e.title, e.start_date, e.end_date, e.is_all_day,
              e.location, e.color, e.category, e.description,
              u.first_name as created_by_name, u.last_name as created_by_last_name
       FROM events e
       JOIN event_attendees ea ON e.id = ea.event_id
       JOIN users u ON e.created_by = u.id
       WHERE ea.user_id = $1 AND ea.status = 'pending'
       ORDER BY e.start_date ASC`,
      [userId]
    );

    return successResponse(res, 200, 'Pending invitations retrieved', {
      invitations: result.rows
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getPendingEventInvitations;
