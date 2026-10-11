const pool = require('../../config/db');
const access = require('../../utils/access');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');

const deleteTask = async (req, res) => {
  const { taskId } = req.params;

  try {

    // F-03: only the task's creator or the event's creator may delete it
    const t = await access.taskAccess(req.user.id, taskId);
    if (!t.task || !(t.isTaskCreator || t.isEventCreator)) {
      return errorResponse(res, 404, 'Task not found');
    }
    if (req.params.id && t.task.event_id && Number(t.task.event_id) !== Number(req.params.id)) {
      return errorResponse(res, 404, 'Task not found');
    }

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