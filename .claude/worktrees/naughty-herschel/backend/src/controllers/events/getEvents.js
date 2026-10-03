const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getEvents = async (req, res) => {
  const userId = req.user.id;

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

    // Get all events for the family, with attendees aggregated per event
    const events = await pool.query(
      `SELECT e.*,
        u.first_name as created_by_name,
        uu.first_name as updated_by_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', att_u.id,
              'first_name', att_u.first_name,
              'last_name', att_u.last_name,
              'color', fm2.color
            )
          ) FILTER (WHERE att_u.id IS NOT NULL),
          '[]'::json
        ) as attendees
       FROM events e
       JOIN users u ON e.created_by = u.id
       LEFT JOIN users uu ON e.updated_by = uu.id
       LEFT JOIN event_attendees ea_filter ON e.id = ea_filter.event_id AND ea_filter.user_id = $2
       LEFT JOIN event_attendees ea_all ON e.id = ea_all.event_id
       LEFT JOIN users att_u ON ea_all.user_id = att_u.id
       LEFT JOIN family_members fm2 ON att_u.id = fm2.user_id AND fm2.family_id = $1
       WHERE e.family_id = $1
       AND (e.created_by = $2 OR ea_filter.event_id IS NOT NULL)
       GROUP BY e.id, u.first_name, uu.first_name
       ORDER BY e.start_date ASC`,
      [familyId, userId]
    );

    return successResponse(res, 200, 'Events retrieved successfully', {
      events: events.rows,
    });

  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getEvents;