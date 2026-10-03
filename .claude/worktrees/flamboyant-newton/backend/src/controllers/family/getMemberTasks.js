const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const getMemberTasks = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT t.id, t.title, t.position, t.created_at,
        t.is_standalone, t.due_date,
        e.id as event_id, e.title as event_title,
        e.start_date, e.end_date, e.color,
        u.first_name as created_by_name  -- ← creator name
 FROM tasks t
 LEFT JOIN events e ON t.event_id = e.id
 LEFT JOIN users u ON t.created_by = u.id
 WHERE t.assigned_to = $1
 ORDER BY COALESCE(e.start_date, t.due_date) ASC NULLS LAST`,
      [userId]
    );
    return successResponse(res, 200, 'Member tasks fetched', {
      tasks: result.rows
    });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = getMemberTasks;