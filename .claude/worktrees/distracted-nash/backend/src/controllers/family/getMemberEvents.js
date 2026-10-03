const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getMemberEvents = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT e.id, e.title, e.start_date, e.end_date, 
              e.color, e.category, e.location, e.priority, e.status
       FROM events e
       JOIN event_attendees ea ON e.id = ea.event_id
       WHERE ea.user_id = $1
       ORDER BY e.start_date ASC`,
      [userId]
    );
    return successResponse(res, 200, 'Member events fetched', {
      events: result.rows
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getMemberEvents;