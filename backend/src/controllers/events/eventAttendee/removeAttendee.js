const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');

const removeAttendee = async (req, res) => {
  const { id, userId } = req.params; // event_id, user_id

  try {
    const result = await pool.query(
      `DELETE FROM event_attendees 
       WHERE event_id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return errorResponse(res, 404, 'Attendee not found');
    }
    return successResponse(res, 200, 'Attendee removed successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = removeAttendee;