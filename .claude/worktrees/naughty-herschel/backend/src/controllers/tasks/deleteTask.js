const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const deleteTask = async (req, res) => {
  const { taskId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM tasks WHERE id = $1 RETURNING *`,
      [taskId]
    );
    if (result.rows.length === 0) {
      return errorResponse(res, 404, 'Task not found');
    }
    return successResponse(res, 200, 'Task deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = deleteTask;