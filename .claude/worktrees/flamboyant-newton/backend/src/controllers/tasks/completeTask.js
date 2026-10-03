const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const completeTask = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE tasks SET completed = true
       WHERE id = $1 AND assigned_to = $2
       RETURNING id`,
      [taskId, userId]
    );
    if (result.rowCount === 0) {
      return errorResponse(res, 404, 'Task not found');
    }
    return successResponse(res, 200, 'Task completed');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = completeTask;
