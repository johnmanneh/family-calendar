const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

// Returns tasks the current user created where the assignee has declined or countered
// and the creator hasn't acknowledged yet
const getTaskNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.status, t.counter_offer, t.last_counter_by,
              e.id as event_id, e.title as event_title,
              u.first_name as assigned_first_name,
              u.last_name as assigned_last_name
       FROM tasks t
       JOIN events e ON t.event_id = e.id
       JOIN users u ON t.assigned_to = u.id
       WHERE t.created_by = $1
       AND t.status IN ('declined', 'countered')
       AND t.last_counter_by = t.assigned_to
       AND t.creator_acknowledged = false
       ORDER BY t.created_at DESC`,
      [userId]
    );

    return successResponse(res, 200, 'Task notifications fetched', { notifications: result.rows });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getTaskNotifications;
