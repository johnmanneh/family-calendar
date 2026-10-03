const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');


const getAttendees = async (req, res) => {
  const { id } = req.params; // event_id

  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, fm.color
       FROM event_attendees ea
       JOIN users u ON ea.user_id = u.id
       JOIN family_members fm ON u.id = fm.user_id
       WHERE ea.event_id = $1`,
      [id]
    );
    return successResponse(res, 200, 'Attendees fetched', {
      attendees: result.rows
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getAttendees;