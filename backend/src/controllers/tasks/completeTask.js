const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');

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

    const memberRes = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (memberRes.rowCount > 0) {
      broadcast(memberRes.rows[0].family_id, 'task_update', { taskId });
    }

    return successResponse(res, 200, 'Task completed');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = completeTask;
