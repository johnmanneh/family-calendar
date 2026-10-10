const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getGroupEvents = async (req, res) => {
  const userId = req.user.id;
  const { id: groupId } = req.params;

  try {
    // Verify user is a member of this group
    const membership = await pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
    if (membership.rows.length === 0) {
      return errorResponse(res, 403, 'You are not a member of this group');
    }

    const result = await pool.query(
      `SELECT e.*, u.first_name as created_by_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', att_u.id, 'first_name', att_u.first_name)
          ) FILTER (WHERE att_u.id IS NOT NULL),
          '[]'::json
        ) as attendees
       FROM events e
       JOIN event_groups eg ON e.id = eg.event_id
       JOIN users u ON e.created_by = u.id
       LEFT JOIN event_attendees ea ON e.id = ea.event_id AND ea.status = 'accepted'
       LEFT JOIN users att_u ON ea.user_id = att_u.id
       WHERE eg.group_id = $1
       GROUP BY e.id, u.first_name
       ORDER BY e.start_date ASC`,
      [groupId]
    );

    return successResponse(res, 200, 'Group events retrieved', { events: result.rows });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getGroupEvents;
