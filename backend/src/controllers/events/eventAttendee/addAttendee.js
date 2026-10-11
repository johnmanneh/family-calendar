const pool = require('../../../config/db');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');
const notifyUser = require('../../../utils/notifyUser');
const access = require('../../../utils/access');

const addAttendee = async (req, res) => {
  const { id } = req.params; // event_id
  const { user_id } = req.body;

  try {
    // F-03: only the event's creator adds people, and only people they may invite
    const event = await access.loadEvent(id);
    if (!event || !(await access.canEditEvent(req.user.id, event))) {
      return errorResponse(res, 404, 'Event not found');
    }
    if (!(await access.canInvite(req.user.id, event, user_id))) {
      return errorResponse(res, 403, 'You can only invite your family or people from your groups');
    }

    // If the attendee is the event creator, auto-accept
    const eventRes = await pool.query(
      'SELECT created_by FROM events WHERE id = $1',
      [id]
    );
    const isCreator = eventRes.rows.length > 0 &&
      Number(eventRes.rows[0].created_by) === Number(user_id);

    // A child profile can't answer an invitation — the parent adding them decides
    const target = await pool.query('SELECT is_managed FROM users WHERE id = $1', [user_id]);
    const isChild = !!target.rows[0]?.is_managed;
    const status = (isCreator || isChild) ? 'accepted' : 'pending';

    const result = await pool.query(
      `INSERT INTO event_attendees (event_id, user_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO UPDATE SET status = EXCLUDED.status
         WHERE event_attendees.status = 'declined'
       RETURNING *`,
      [id, user_id, status]
    );
    if (result.rows.length === 0) {
      return errorResponse(res, 400, 'User is already an attendee');
    }

    // Notify the new attendee (skip if they're the creator — they added themselves)
    if (!isCreator && !isChild) {
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
        notifyUser(
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