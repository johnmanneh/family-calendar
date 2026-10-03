const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const acknowledgeAssigneeNotification = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE tasks SET assignee_acknowledged = true
       WHERE id = $1 AND assigned_to = $2
       RETURNING id`,
      [taskId, userId]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, 404, 'Task not found');
    }

    return successResponse(res, 200, 'Acknowledged');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = acknowledgeAssigneeNotification;
