const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');

const addAttendee = async (req, res) => {
  const { id } = req.params; // event_id
  const { user_id } = req.body;

  try {
    // If the attendee is the event creator, auto-accept
    const eventRes = await pool.query(
      'SELECT created_by FROM events WHERE id = $1',
      [id]
    );
    const isCreator = eventRes.rows.length > 0 &&
      Number(eventRes.rows[0].created_by) === Number(user_id);

    const status = isCreator ? 'accepted' : 'pending';

    const result = await pool.query(
      `INSERT INTO event_attendees (event_id, user_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, user_id, status]
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