const pool = require('../../../config/db');
const access = require('../../../utils/access');
const { successResponse, errorResponse } = require('../../../utils/response/responseHandlers');

const deleteSubTask = async (req, res) => {
  const { subTaskId } = req.params;

  try {

    // F-03: the subtask must belong to this task, and only its creator/assignee/event creator may delete
    const st = await pool.query('SELECT task_id FROM sub_tasks WHERE id = $1', [subTaskId]);
    if (!st.rows.length || Number(st.rows[0].task_id) !== Number(req.params.taskId)) {
      return errorResponse(res, 404, 'SubTask not found');
    }
    const t = await access.taskAccess(req.user.id, req.params.taskId);
    if (!t.task || !(t.isTaskCreator || t.isAssignee || t.isEventCreator)) {
      return errorResponse(res, 404, 'SubTask not found');
    }

    const result = await pool.query(
      `DELETE FROM sub_tasks WHERE id = $1 RETURNING *`,
      [subTaskId]
    );
    if (result.rows.length === 0) {
      return errorResponse(res, 404, 'SubTask not found');
    }
    return successResponse(res, 200, 'SubTask deleted successfully');
  } catch (error) {
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = deleteSubTask;