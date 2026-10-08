const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');

// PATCH /api/tasks/:taskId
// Updates title, assigned_to, position, due_date of a standalone or event task.
const updateTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;
  const { title, assigned_to, position, due_date } = req.body;

  try {
    // Verify the task exists and the user is the creator
    const taskRes = await pool.query(
      `SELECT id, created_by FROM tasks WHERE id = $1`,
      [taskId]
    );
    if (taskRes.rowCount === 0) return errorResponse(res, 404, 'Task not found');

    const task = taskRes.rows[0];
    if (Number(task.created_by) !== Number(userId)) {
      return errorResponse(res, 403, 'Only the task creator can edit it');
    }

    // Build update — only set fields that were provided
    const result = await pool.query(
      `UPDATE tasks
       SET title       = COALESCE($1, title),
           assigned_to = COALESCE($2, assigned_to),
           position    = COALESCE($3, position),
           due_date    = $4
       WHERE id = $5
       RETURNING *`,
      [
        title?.trim() || null,
        assigned_to   || null,
        position      || null,
        due_date      || null,   // explicit null clears it
        taskId,
      ]
    );

    // Broadcast to family
    const memberRes = await pool.query(
      `SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (memberRes.rowCount > 0) {
      broadcast(memberRes.rows[0].family_id, 'task_update', { taskId: Number(taskId) });
    }

    return successResponse(res, 200, 'Task updated', { task: result.rows[0] });
  } catch (err) {
    console.error('updateTask error:', err.message);
    return errorResponse(res, 500, 'Server error');
  }
};

module.exports = updateTask;
