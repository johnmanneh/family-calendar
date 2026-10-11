const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');
const access = require('../../../utils/access');


const getAttendees = async (req, res) => {
  const { id } = req.params; // event_id

  try {
    // F-02/F-03: attendees are event details — only for people who see the event in full
    const { level } = await access.eventAccess(req.user.id, id);
    if (level !== 'full') return errorResponse(res, 404, 'Event not found');

    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, fm.color, ea.status
       FROM event_attendees ea
       JOIN users u ON ea.user_id = u.id
       JOIN events e ON e.id = ea.event_id
       LEFT JOIN family_members fm ON fm.user_id = u.id AND fm.family_id = e.family_id
       WHERE ea.event_id = $1 AND ea.status != 'declined'`,
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