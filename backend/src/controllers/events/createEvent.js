const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');
const { canManageCalendar } = require('../../utils/access');
const notifyUser = require('../../utils/notifyUser');

const createEvent = async (req, res) => {
  const userId = req.user.id;
  const {
    title,
    description,
    start_date,
    end_date,
    location,
    is_all_day,
    is_private,
    recurrence,
    recurrence_end_date,
    reminder,
    second_reminder,
    color,
    category,
    priority,
    url,
    notes,
    travel_time,
    video_call_link,
    status,
  } = req.body;

  if (!title || !start_date) {
    return errorResponse(res, 400, 'Title and start date are required');
  }

  try {
    // Get user's family
    const familyMember = await pool.query(
      `SELECT fm.family_id FROM family_members fm
       WHERE fm.user_id = $1
       ORDER BY fm.is_active DESC, (SELECT COUNT(*) FROM family_members WHERE family_id = fm.family_id) DESC
       LIMIT 1`,
      [userId]
    );

    if (familyMember.rows.length === 0) {
      return errorResponse(res, 404, 'You are not a member of any family');
    }

    const familyId = familyMember.rows[0].family_id;

    // Whose calendar? Default: your own. Creating for someone else (a child
    // profile, or an adult who granted you "create") is checked on the server.
    const ownerId = req.body.owner_id ? Number(req.body.owner_id) : Number(userId);
    if (ownerId !== Number(userId)) {
      const sameFamily = await pool.query(
        'SELECT 1 FROM family_members WHERE family_id = $1 AND user_id = $2', [familyId, ownerId]
      );
      if (!sameFamily.rows.length || !(await canManageCalendar(userId, ownerId, 'create'))) {
        return errorResponse(res, 403, "You can't add events to this calendar");
      }
    }

    const newEvent = await pool.query(
      `INSERT INTO events (
        title, description, start_date, end_date, family_id, created_by,
        location, is_all_day, is_private, recurrence, recurrence_end_date, reminder,
        second_reminder, color, category, priority, url, notes, travel_time,
        video_call_link, status, owner_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *`,
      [
        title, description, start_date, end_date, familyId, userId,
        location, is_all_day, is_private || false, recurrence, recurrence_end_date, reminder,
        second_reminder, color, category, priority, url, notes, travel_time,
        video_call_link, status || 'confirmed', ownerId,
      ]
    );

    // On someone else's calendar: they're on the event (so it shows under their
    // name everywhere) and, if they have an account, they're told who added it
    if (ownerId !== Number(userId)) {
      await pool.query(
        `INSERT INTO event_attendees (event_id, user_id, status) VALUES ($1, $2, 'accepted')
         ON CONFLICT (event_id, user_id) DO NOTHING`,
        [newEvent.rows[0].id, ownerId]
      );
      const who = await pool.query(
        'SELECT a.first_name AS actor, o.is_managed FROM users a, users o WHERE a.id = $1 AND o.id = $2',
        [userId, ownerId]
      );
      if (who.rows[0] && !who.rows[0].is_managed) {
        notifyUser(ownerId, 'event_added_for_you', 'New on your calendar',
          `${who.rows[0].actor} added: ${title}`, { eventId: newEvent.rows[0].id });
      }
    }

    broadcast(familyId, 'event_update', { eventId: newEvent.rows[0].id });

    return successResponse(res, 201, 'Event created successfully', {
      event: newEvent.rows[0],
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = createEvent;