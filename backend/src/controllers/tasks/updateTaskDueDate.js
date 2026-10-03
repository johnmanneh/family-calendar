const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const updateTaskDueDate = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;
  const { due_date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE tasks SET due_date = $1
       WHERE id = $2 AND (assigned_to = $3 OR created_by = $3)
       RETURNING *`,
      [due_date || null, taskId, userId]
    );

    if (result.rowCount === 0) {
      return errorResponse(res, 404, 'Task not found or not authorised');
    }

    return successResponse(res, 200, 'Due date updated', { task: result.rows[0] });
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = updateTaskDueDate;
