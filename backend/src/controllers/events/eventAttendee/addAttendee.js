const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');
const insertNotification = require('../../../utils/insertNotification');

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

    // Notify the new attendee (skip if they're the creator — they added themselves)
    if (!isCreator) {
      const eventDetail = await pool.query(
        `SELECT e.title, u.first_name, u.last_name
         FROM events e
         JOIN users u ON u.id = e.created_by
         WHERE e.id = $1`,
        [id]
      );
      if (eventDetail.rows.length > 0) {
        const { title, first_name, last_name } = eventDetail.rows[0];
        const creatorName = [first_name, last_name].filter(Boolean).join(' ') || 'Someone';
        insertNotification(
          user_id,
          'event_invited',
          'Event invitation',
          `${creatorName} invited you to: ${title}`,
          { eventId: Number(id) }
        );
      }
    }

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