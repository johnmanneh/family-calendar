const pool = require('../../config/db');
const { ACTIVE_FAMILY_ORDER } = require('../../utils/activeFamily');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');
const { taskAccess } = require('../../utils/access');
const notifyUser = require('../../utils/notifyUser');

const completeTask = async (req, res) => {
  const { taskId } = req.params;
  const userId = req.user.id;

  try {
    // The assignee or the person who created the task may mark it done
    const { task, canView, isAssignee } = await taskAccess(userId, taskId);
    const isCreator = task && Number(task.created_by) === Number(userId);
    if (!task || !canView || (!isAssignee && !isCreator)) {
      return errorResponse(res, 404, 'Task not found');
    }

    const result = await pool.query(
      `UPDATE tasks SET completed = true
       WHERE id = $1 AND (assigned_to = $2 OR created_by = $2)
       RETURNING id, title, assigned_to, created_by`,
      [taskId, userId]
    );
    if (result.rowCount === 0) {
      return errorResponse(res, 404, 'Task not found');
    }

    // Tell the other person (assignee finished → creator; creator closed it → assignee)
    const done = result.rows[0];
    const other = Number(done.assigned_to) === Number(userId) ? done.created_by : done.assigned_to;
    if (other && Number(other) !== Number(userId)) {
      const who = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
      const name = [who.rows[0]?.first_name, who.rows[0]?.last_name].filter(Boolean).join(' ') || 'Someone';
      await notifyUser(other, 'task_completed', 'Task done', `${name}: ${done.title}`, { taskId: Number(taskId) });
    }

    const memberRes = await pool.query(
      `SELECT fm.family_id FROM family_members fm WHERE fm.user_id = $1 ORDER BY ${ACTIVE_FAMILY_ORDER} LIMIT 1`,
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
