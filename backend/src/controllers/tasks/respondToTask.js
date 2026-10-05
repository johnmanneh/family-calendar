const pool = require('../../config/db');
const { successResponse, errorResponse } = require('../../utils/response/responseHandlers');
const { broadcast } = require('../../utils/sseClients');

const respondToTask = async (req, res) => {
  const userId = req.user.id;
  const { taskId } = req.params;
  const { response, counter_offer } = req.body;

  const validResponses = ['accepted', 'declined', 'countered'];
  if (!validResponses.includes(response)) {
    return errorResponse(res, 400, 'Invalid response');
  }

  if (response === 'countered' && !counter_offer?.trim()) {
    return errorResponse(res, 400, 'Counter offer text is required');
  }

  try {
    // Fetch task to validate it's this user's turn
    const taskRes = await pool.query(
      `SELECT assigned_to, created_by, status, last_counter_by, counter_offer FROM tasks WHERE id = $1`,
      [taskId]
    );

    if (taskRes.rowCount === 0) return errorResponse(res, 404, 'Task not found');

    const task = taskRes.rows[0];
    const isAssignee = Number(task.assigned_to) === Number(userId);
    const isCreator  = Number(task.created_by)  === Number(userId);

    // For pending tasks: any family member can accept/decline (home screen quick-accept).
    // For countered tasks: strict turn-based — only the other party can respond.
    const canRespondToPending = task.status === 'pending';

    const assigneeTurn =
      (task.status === 'countered' && isAssignee && Number(task.last_counter_by) === Number(task.created_by));

    const creatorTurn =
      task.status === 'countered' && isCreator && Number(task.last_counter_by) === Number(task.assigned_to);

    if (!canRespondToPending && !assigneeTurn && !creatorTurn) {
      return errorResponse(res, 403, 'Not your turn to respond');
    }

    // Creator cannot decline — only accept or counter
    if (isCreator && response === 'declined') {
      return errorResponse(res, 400, 'Creator can only accept or counter');
    }

    const acceptingCounter = response === 'accepted' && !!task.counter_offer;
    const notifyAssignee = response === 'accepted' && isCreator && !!task.counter_offer;

    // Check if task has sub-tasks — if so, update the latest sub-task title instead of the parent
    const subTaskRes = await pool.query(
      `SELECT id FROM sub_tasks WHERE task_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [taskId]
    );
    const latestSubTaskId = subTaskRes.rows[0]?.id;

    if (acceptingCounter && latestSubTaskId) {
      // Update the latest sub-task title to the counter offer text
      await pool.query(
        `UPDATE sub_tasks SET title = $1 WHERE id = $2`,
        [task.counter_offer, latestSubTaskId]
      );
    }

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1,
           title = CASE WHEN $2 THEN counter_offer ELSE title END,
           counter_offer = CASE WHEN $3 THEN $4 ELSE null END,
           last_counter_by = $5,
           creator_acknowledged = false,
           assignee_acknowledged = CASE WHEN $6 THEN false ELSE true END
       WHERE id = $7
       RETURNING *`,
      [
        response,
        acceptingCounter && !latestSubTaskId,   // only rename parent task if no sub-tasks
        response === 'countered',
        response === 'countered' ? counter_offer.trim() : null,
        response === 'countered' ? userId : null,
        notifyAssignee,
        taskId,
      ]
    );

    // Notify all family members in real-time
    const memberRes = await pool.query(
      'SELECT family_id FROM family_members WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    if (memberRes.rowCount > 0) {
      broadcast(memberRes.rows[0].family_id, 'task_update', { taskId });
    }

    return successResponse(res, 200, 'Task response saved', { task: result.rows[0] });
  } catch (error) {
    console.error('respondToTask error:', error.message);
    return errorResponse(res, 500, error.message);
  }
};

module.exports = respondToTask;
