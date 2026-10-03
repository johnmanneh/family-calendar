const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// Returns tasks assigned to me where the creator accepted my counter — I haven't seen it yet
const getAssigneeNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.status, t.due_date,
              e.id as event_id, e.title as event_title,
              u.first_name as created_by_first_name,
              u.last_name as created_by_last_name
       FROM tasks t
       LEFT JOIN events e ON t.event_id = e.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.assigned_to = $1
       AND t.status = 'accepted'
       AND t.assignee_acknowledged = false`,
      [userId]
    );

    return successResponse(res, 200, 'Assignee notifications fetched', {
      notifications: result.rows
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getAssigneeNotifications;
