const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');

const addAttendee = async (req, res) => {
  const { id } = req.params; // event_id
  const { user_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO event_attendees (event_id, user_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING *`,
      [id, user_id]
    );
    return successResponse(res, 201, 'Attendee added successfully', {
      attendee: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // unique violation
      return errorResponse(res, 400, 'User is already an attendee');
    }
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = addAttendee;