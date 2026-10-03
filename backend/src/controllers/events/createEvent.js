const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');

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
      'SELECT family_id FROM family_members WHERE user_id = $1',
      [userId]
    );

    if (familyMember.rows.length === 0) {
      return errorResponse(res, 404, 'You are not a member of any family');
    }

    const familyId = familyMember.rows[0].family_id;

    const newEvent = await pool.query(
      `INSERT INTO events (
        title, description, start_date, end_date, family_id, created_by,
        location, is_all_day, is_private, recurrence, recurrence_end_date, reminder,
        second_reminder, color, category, priority, url, notes, travel_time,
        video_call_link, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        title, description, start_date, end_date, familyId, userId,
        location, is_all_day, is_private || false, recurrence, recurrence_end_date, reminder,
        second_reminder, color, category, priority, url, notes, travel_time,
        video_call_link, status || 'confirmed',
      ]
    );

    broadcast(familyId, 'event_update', { eventId: newEvent.rows[0].id });

    return successResponse(res, 201, 'Event created successfully', {
      event: newEvent.rows[0],
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = createEvent;